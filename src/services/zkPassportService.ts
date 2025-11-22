import { ZKPassport } from "@zkpassport/sdk";

/**
 * Initialize ZKPassport SDK
 * In browser, domain is automatically inferred from window.location
 * This ensures proper communication between the mobile app and web app
 */
const zkPassport = new ZKPassport();

export interface VerificationCallbacks {
  onRequestReceived: () => void;
  onGeneratingProof: () => void;
  onProofGenerated: (data: { proof?: any; vkeyHash?: string; version?: string; name?: string }) => void;
  onResult: (data: { uniqueIdentifier?: string; verified: boolean; result: any }) => void;
  onReject: () => void;
  onError: (error: Error | string) => void;
}

/**
 * Create a ZKPassport verification request for proof of humanity
 * This verifies the user is a real person (age >= 18)
 */
export async function createHumanityVerificationRequest(
  callbacks: VerificationCallbacks
) {
  try {
    console.log("Initializing ZKPassport request...");
    
    // Create a request with app details
    const queryBuilder = await zkPassport.request({
      name: "Coffee Traceability Platform",
      logo: `${window.location.origin}/logo.svg`,
      purpose: "Prove you are a human (18+) to access coffee traceability features",
      scope: "coffee-traceability-humanity",
    });

    console.log("Query builder created, building query...");

    // Build query to verify user is 18 or older (proof of humanity)
    const {
      url,
      requestId,
      onRequestReceived,
      onGeneratingProof,
      onProofGenerated,
      onResult,
      onReject,
      onError,
    } = queryBuilder
      // Verify the user's age is greater than or equal to 18
      .gte("age", 18)
      // Finalize the query
      .done();

    console.log("Query built, URL:", url);
    console.log("Request ID:", requestId);

    // Set up callbacks
    onRequestReceived(() => {
      console.log("onRequestReceived callback triggered");
      callbacks.onRequestReceived();
    });

    onGeneratingProof(() => {
      console.log("onGeneratingProof callback triggered");
      callbacks.onGeneratingProof();
    });

    onProofGenerated((data) => {
      console.log("onProofGenerated callback triggered", data);
      callbacks.onProofGenerated(data);
    });

    onResult((data) => {
      console.log("=== onResult in zkPassportService ===");
      console.log("Raw data received:", data);
      console.log("Data type:", typeof data);
      console.log("Data keys:", Object.keys(data || {}));
      console.log("Verified:", (data as any)?.verified);
      console.log("Unique identifier:", (data as any)?.uniqueIdentifier);
      callbacks.onResult(data);
    });

    onReject(() => {
      console.log("onReject callback triggered");
      callbacks.onReject();
    });

    onError((error: unknown) => {
      console.error("onError callback triggered", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
        error: error
      });
      const errorObj = error instanceof Error ? error : new Error(String(error));
      callbacks.onError(errorObj);
    });

    return {
      url,
      requestId,
    };
  } catch (error) {
    console.error("Error in createHumanityVerificationRequest:", error);
    const errorObj = error instanceof Error ? error : new Error(String(error));
    callbacks.onError(errorObj);
    throw error;
  }
}

