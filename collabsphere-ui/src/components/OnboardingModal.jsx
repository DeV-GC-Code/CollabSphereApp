import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icons } from "./Icons.jsx";

const TOTAL_STEPS = 6;

export function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleDone = () => {
    localStorage.setItem("cs_onboarding_done", "1");
    onClose();
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      handleDone();
    }
  };

  const tasks = [
    {
      icon: Icons.Edit,
      title: "Complete your profile",
      desc: "Add your skills and workplace to stand out",
      action: "Go to Profile",
      link: "/profile",
    },
    {
      icon: Icons.Globe,
      title: "Join your first 3 spheres",
      desc: "Find communities that match your interests",
      action: "Explore Spheres",
      link: "/spheres",
    },
    {
      icon: Icons.Users,
      title: "Connect with 5 people",
      desc: "Build your professional network",
      action: "Find Connections",
      link: "/network",
    },
  ];

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Welcome to CollabSphere">
      <div className="onboarding-modal">
        {/* Progress bar */}
        <div className="onboarding-progress">
          <div className="onboarding-progress__fill" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>

        <div className="onboarding-modal__header">
          <p className="onboarding-step-indicator">Step {step} of {TOTAL_STEPS}</p>
          <h2>Welcome to CollabSphere!</h2>
          <p>Your professional community awaits. Let&apos;s get you set up.</p>
        </div>

        {/* Illustration area */}
        <div className="onboarding-illustration">
          <div className="onboarding-illustration__network" aria-hidden="true">
            <span className="onboarding-node onboarding-node--center"><Icons.Hub /></span>
            <span className="onboarding-node onboarding-node--top"><Icons.Users /></span>
            <span className="onboarding-node onboarding-node--right"><Icons.Globe /></span>
            <span className="onboarding-node onboarding-node--bottom"><Icons.MessageCircle /></span>
            <span className="onboarding-node onboarding-node--left"><Icons.Edit /></span>
          </div>
        </div>

        <div className="onboarding-modal__tasks">
          {tasks.map((task, i) => (
            <div key={i} className="onboarding-task-card">
              <div className="onboarding-task-card__icon">
                <task.icon />
              </div>
              <div className="onboarding-task-card__body">
                <strong>{task.title}</strong>
                <span>{task.desc}</span>
              </div>
              <button
                type="button"
                className="button button--primary button--sm"
                onClick={() => {
                  handleDone();
                  navigate(task.link);
                }}
              >
                {task.action}
              </button>
            </div>
          ))}
        </div>

        <div className="onboarding-modal__actions">
          <button
            type="button"
            className="onboarding-skip-btn"
            onClick={handleDone}
          >
            Skip for now
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={handleNext}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
