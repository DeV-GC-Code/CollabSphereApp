import { Icons } from "./Icons.jsx";

export function OnboardingModal({ onClose }) {
  const handleDone = () => {
    localStorage.setItem("cs_onboarding_done", "1");
    onClose();
  };

  const steps = [
    {
      icon: Icons.Edit,
      title: "Complete your profile",
      desc: "Add your skills and workplace",
    },
    {
      icon: Icons.Hub,
      title: "Join your first Sphere",
      desc: "Find communities that match your interests",
    },
    {
      icon: Icons.Users,
      title: "Connect with people",
      desc: "Build your professional network",
    },
  ];

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Welcome to CollabSphere">
      <div className="onboarding-modal">
        <div className="onboarding-modal__header">
          <div className="onboarding-modal__icon">
            <Icons.Sparkles />
          </div>
          <h2>Welcome to CollabSphere!</h2>
          <p>Your professional community awaits. Let&apos;s get you set up.</p>
        </div>

        <div className="onboarding-modal__steps">
          {steps.map((step, i) => (
            <div key={i} className="onboarding-step">
              <div className="onboarding-step__num">{i + 1}</div>
              <div className="onboarding-step__icon">
                <step.icon />
              </div>
              <div className="onboarding-step__body">
                <strong>{step.title}</strong>
                <span>{step.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="onboarding-modal__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={handleDone}
          >
            Skip for now
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={handleDone}
          >
            <Icons.ArrowRight /> Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
