import HumanityProof from "../components/HumanityProof";

/**
 * Humanity Proof Page
 */
function HumanityProofPage() {
  return (
    <div className="page-content">
      <h1 className="page-title">Humanity Proof</h1>
      <p className="page-description">
        Verify your identity using ZKPassport to prove you are a real person
      </p>
      <div className="wallet-card">
        <HumanityProof />
      </div>
    </div>
  );
}

export default HumanityProofPage;

