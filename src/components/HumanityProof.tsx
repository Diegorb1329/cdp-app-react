import { useState, useEffect, useRef } from "react";
import { useEvmAddress } from "@coinbase/cdp-hooks";
import QRCode from "qrcode";
import { createHumanityVerificationRequest } from "../services/zkPassportService";
import { updateZKVerification } from "../services/userService";
import { useUser } from "../hooks/useUser";

type VerificationStatus = "idle" | "requesting" | "requested" | "generating" | "success" | "error" | "rejected";

/**
 * Humanity Proof component for ZKPassport verification
 */
function HumanityProof() {
  const { evmAddress } = useEvmAddress();
  const { user, loading: userLoading } = useUser();
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [proofsGenerated, setProofsGenerated] = useState<number>(0);
  const [expectedProofs, setExpectedProofs] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef<string | null>(null);

  // Check if user is on mobile device (only check once, not on every resize)
  useEffect(() => {
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    setIsMobileDevice(mobile);
    console.log("Mobile detection (initial):", mobile, "Width:", window.innerWidth);
  }, []);

  // Check if user is already verified
  useEffect(() => {
    if (user?.zk_verified) {
      setStatus("success");
    }
  }, [user]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle page visibility changes - ensure polling continues when user returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && (status === "requested" || status === "generating")) {
        console.log("Page became visible, SDK should continue polling...");
        console.log("Current status:", status);
        console.log("Request ID:", requestId);
        // The SDK should automatically continue polling when page becomes visible
        // This is just for logging/debugging
      }
    };

    const handleFocus = () => {
      if (status === "requested" || status === "generating") {
        console.log("Window focused, SDK should continue polling...");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [status, requestId]);

  const generateQRCode = async (url: string) => {
    try {
      console.log("Generating QR code for URL:", url);
      // Generate QR code directly as data URL (no canvas needed)
      const dataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
      console.log("QR code generated, data URL length:", dataUrl.length);
      setQrCodeUrl(dataUrl);
      
      // Also generate to canvas for backup (if needed)
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, url, {
          width: 300,
          margin: 2,
        });
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      setErrorMessage("Failed to generate QR code. Please try again.");
    }
  };

  const handleStartValidation = async () => {
    console.log("Start validation clicked");
    
    if (!evmAddress) {
      console.error("No wallet address found");
      setErrorMessage("Wallet address not found. Please connect your wallet.");
      setStatus("error");
      return;
    }

    console.log("Starting validation process...");
    setStatus("requesting");
    setErrorMessage(null);

    try {
      console.log("Creating ZKPassport verification request...");
      const { url, requestId: reqId } = await createHumanityVerificationRequest({
        onRequestReceived: () => {
          console.log("Request received by ZKPassport app");
          // Status is already "requested" at this point, just log
        },
        onGeneratingProof: () => {
          console.log("Proof generation started");
          setStatus("generating");
        },
        onProofGenerated: (data) => {
          console.log("Proof generated:", data);
          // Log progress if total is available
          if (data && typeof data === 'object' && 'total' in data && 'index' in data) {
            const index = (data as any).index;
            const total = (data as any).total;
            const name = (data as any).name || 'unknown';
            setProofsGenerated(index);
            setExpectedProofs(total);
            console.log(`Proof progress: ${index}/${total} proofs generated`);
            console.log(`Current proof name: ${name}`);
            
            if (index === total) {
              console.log("✅ All proofs generated, waiting for final result...");
              console.log("The SDK should now verify all proofs and call onResult");
              // Don't clear timeout yet - wait for onResult
              // But extend it a bit more since verification might take time
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                // Give 30 more seconds for final verification
                timeoutRef.current = setTimeout(() => {
                  console.error("Timeout after all proofs generated - onResult never called");
                  setStatus("error");
                  setErrorMessage(
                    "All proofs were generated but verification timed out. " +
                    "This might be a bug in the ZKPassport SDK. Please try again or contact support."
                  );
                }, 30000);
              }
            } else if (index === 3 && total === 4) {
              console.warn("⚠️ Stuck at 3/4 proofs - the 4th proof (disclosure) should generate next");
              console.warn("If this doesn't progress, there might be an issue with the ZKPassport app or network");
              console.warn("The SDK uses WebSocket to receive proofs - check Network tab for WebSocket connection status");
              console.warn("Request ID for debugging:", requestIdRef.current || "not available");
              
              // Log after 10 seconds if still stuck
              const currentReqId = requestIdRef.current;
              setTimeout(() => {
                // Use ref to get current values
                if (proofsGenerated === 3 && expectedProofs === 4 && status === "generating") {
                  console.error("❌ Still stuck at 3/4 after 10 seconds");
                  console.error("This is likely a bug in the ZKPassport SDK or mobile app");
                  console.error("Possible causes:");
                  console.error("1. Mobile app froze during proof generation");
                  console.error("2. WebSocket connection lost");
                  console.error("3. Network issue preventing 4th proof from being sent");
                  console.error("Request ID:", currentReqId);
                  console.error("Recommendation: Try again or report this issue to ZKPassport support");
                  console.error("Include this Request ID when reporting:", currentReqId);
                }
              }, 10000);
            }
          }
        },
        onResult: async (data: any) => {
          // Clear timeout since we got a result
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          console.log("=== onResult callback triggered in component ===");
          console.log("Full result data:", data);
          console.log("Data type:", typeof data);
          console.log("Data keys:", Object.keys(data || {}));
          
          // Log the structure as shown in docs
          console.log("verified:", data?.verified);
          console.log("uniqueIdentifier:", data?.uniqueIdentifier);
          console.log("result:", data?.result);
          
          // Log age verification result (since we only check age >= 18)
          if (data?.result?.age?.gte) {
            console.log("Age verification result:", data.result.age.gte.result);
            console.log("Age expected (>=):", data.result.age.gte.expected);
          }
          
          // Check verification status
          const verified = data?.verified === true;
          const uniqueIdentifier = data?.uniqueIdentifier;
          
          console.log("Parsed - verified:", verified, "uniqueIdentifier:", uniqueIdentifier);
          
          if (!verified) {
            console.error("Verification failed - verified is false");
            console.error("Full result data:", JSON.stringify(data, null, 2));
            setStatus("error");
            setErrorMessage("Verification failed. The proof could not be verified.");
            return;
          }

          // uniqueIdentifier might be undefined even if verified is true
          // According to docs: "If verified is false, uniqueIdentifier will be undefined"
          // But we should still update the database with verified=true even if no uniqueIdentifier
          if (!uniqueIdentifier) {
            console.warn("Warning: Verified is true but no uniqueIdentifier received");
            console.warn("This might be expected in some cases, updating database anyway");
          }

          console.log("Verification successful, updating database...");
          console.log("Wallet address:", evmAddress);
          console.log("Unique identifier:", uniqueIdentifier || "none");
          
          if (!evmAddress) {
            console.error("No wallet address available");
            setStatus("error");
            setErrorMessage("Wallet address not found. Please reconnect your wallet.");
            return;
          }
          
          try {
            // Update database with verification status
            const updatedUser = await updateZKVerification(
              evmAddress,
              true,
              uniqueIdentifier || null
            );

            if (updatedUser) {
              console.log("Database updated successfully:", updatedUser);
              setStatus("success");
              setVerificationUrl(null);
              setQrCodeUrl(null);
              setProofsGenerated(0);
              setExpectedProofs(0);
            } else {
              console.error("Failed to update database - updateZKVerification returned null");
              setStatus("error");
              setErrorMessage("Failed to update verification status in database. Please try again.");
            }
          } catch (error) {
            console.error("Error updating database:", error);
            setStatus("error");
            setErrorMessage(`Database update error: ${error instanceof Error ? error.message : String(error)}`);
          }
        },
        onReject: () => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          console.log("User rejected verification");
          setStatus("rejected");
          setVerificationUrl(null);
          setQrCodeUrl(null);
          setProofsGenerated(0);
          setExpectedProofs(0);
        },
        onError: (error) => {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          console.error("ZKPassport error:", error);
          setStatus("error");
          const errorMessage = error instanceof Error ? error.message : String(error);
          setErrorMessage(errorMessage || "An error occurred during verification");
          setVerificationUrl(null);
          setQrCodeUrl(null);
          setProofsGenerated(0);
          setExpectedProofs(0);
        },
      });

      console.log("Verification URL received:", url);
      console.log("Request ID:", reqId);
      setVerificationUrl(url);
      setRequestId(reqId);
      requestIdRef.current = reqId; // Store in ref for use in callbacks
      setProofsGenerated(0);
      setExpectedProofs(0);
      await generateQRCode(url);
      console.log("QR code generated");
      
      // Set a safety timeout - if no result after 90 seconds, show error
      // Base proofs can take 10-50 seconds, so we need more time
      timeoutRef.current = setTimeout(() => {
        if (status === "generating" || status === "requested") {
          console.error("Verification timeout - no result received after 90 seconds");
          console.error(`Proofs generated: ${proofsGenerated}/${expectedProofs}`);
          console.error("Request ID:", reqId);
          setStatus("error");
          setErrorMessage(
            `Verification timed out after generating ${proofsGenerated}/${expectedProofs} proofs. ` +
            "This might be a network issue or a problem with the ZKPassport app. Please try again."
          );
        }
      }, 90000);
      
      // Set status to "requested" immediately after getting URL to show QR code
      // The onRequestReceived callback will fire when user actually scans/clicks
      setStatus("requested");
    } catch (error) {
      console.error("Error in handleStartValidation:", error);
      setStatus("error");
      const errorMsg = error instanceof Error ? error.message : String(error);
      setErrorMessage(errorMsg || "Failed to create verification request");
    }
  };

  if (userLoading) {
    return (
      <div className="humanity-proof">
        <p>Loading...</p>
      </div>
    );
  }

  const isVerified = user?.zk_verified || status === "success";
  
  // Debug info
  console.log("HumanityProof render:", {
    evmAddress,
    user,
    status,
    isVerified,
    verificationUrl,
    qrCodeUrl: qrCodeUrl ? `QR code exists (${qrCodeUrl.length} chars)` : "No QR code",
    isMobileDevice,
  });

  return (
    <div className="humanity-proof">
      <h2 className="card-title">Humanity Proof</h2>
      
      <div className="humanity-proof-content">
        <p className="humanity-proof-description">
          Verify your identity using ZKPassport to prove you are a real person.
          This verification uses zero-knowledge proofs to protect your privacy while
          confirming your humanity status.
        </p>

        {isVerified ? (
          <div className="humanity-proof-success">
            <div className="success-icon">✓</div>
            <h3 className="success-title">Verified</h3>
            <p className="success-message">
              Your humanity has been verified. Your unique identifier:{" "}
              <code className="unique-identifier">
                {user?.unique_identifier || "N/A"}
              </code>
            </p>
          </div>
        ) : (
          <>
            {status === "idle" && (
              <div>
                <button
                  className="humanity-proof-button"
                  onClick={handleStartValidation}
                  disabled={!evmAddress}
                >
                  Start Validation
                </button>
                {!evmAddress && (
                  <p className="humanity-proof-warning" style={{ marginTop: "1rem", color: "#dc2626", fontSize: "0.9rem" }}>
                    Please connect your wallet to start validation
                  </p>
                )}
              </div>
            )}

            {status === "requesting" && (
              <div className="humanity-proof-loading">
                <p>Creating verification request...</p>
              </div>
            )}

            {(status === "requested" || status === "generating") && verificationUrl && (
              <div className="humanity-proof-qr">
                <h3 className="qr-title">
                  {status === "requested"
                    ? isMobileDevice
                      ? "Open ZKPassport App"
                      : "Scan QR Code or Click Link"
                    : "Generating Proof..."}
                </h3>
                {status === "requested" && (
                  <>
                    {/* Mobile: Show link prominently */}
                    {isMobileDevice ? (
                      <div className="mobile-verification">
                        <a
                          href={verificationUrl}
                          className="humanity-proof-link-mobile"
                        >
                          Verify with ZKPassport
                        </a>
                        <p className="qr-instructions">
                          Tap the link above to open the ZKPassport app and complete verification.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Desktop: Show QR code and link */}
                        <canvas ref={canvasRef} style={{ display: "none" }} />
                        {qrCodeUrl ? (
                          <div className="qr-code-container">
                            <img 
                              src={qrCodeUrl} 
                              alt="ZKPassport QR Code" 
                              className="qr-code-image"
                              onLoad={() => console.log("QR code image loaded successfully")}
                              onError={(e) => console.error("QR code image failed to load", e)}
                            />
                          </div>
                        ) : (
                          <div className="humanity-proof-loading">
                            <div className="spinner"></div>
                            <p>Generating QR code...</p>
                          </div>
                        )}
                        {verificationUrl && (
                          <>
                            <a
                              href={verificationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="humanity-proof-link"
                            >
                              Verify with ZKPassport
                            </a>
                            <p className="qr-instructions">
                              Scan the QR code with your mobile device or click the link above
                              to open the ZKPassport app and complete verification.
                            </p>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
                {status === "generating" && (
                  <div className="generating-indicator">
                    <div className="spinner"></div>
                    <p>This may take up to 10 seconds...</p>
                    {expectedProofs > 0 && (
                      <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#666" }}>
                        Generating proofs: {proofsGenerated}/{expectedProofs}
                      </p>
                    )}
                    <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
                      Keep this page open and visible. If you completed verification on your phone, 
                      the results should appear automatically.
                    </p>
                  </div>
                )}
              </div>
            )}

            {status === "rejected" && (
              <div className="humanity-proof-error">
                <p>Verification was rejected. You can try again.</p>
                <button
                  className="humanity-proof-button"
                  onClick={handleStartValidation}
                >
                  Try Again
                </button>
              </div>
            )}

            {status === "error" && (
              <div className="humanity-proof-error">
                <p className="error-message">{errorMessage || "An error occurred"}</p>
                <button
                  className="humanity-proof-button"
                  onClick={handleStartValidation}
                >
                  Try Again
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default HumanityProof;

