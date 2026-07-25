import React, { useState } from "react";
import { supabase } from "../constants/supabaseClient";
import { useNavigate } from "react-router-dom";

const TuraLogo = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="36" height="36" rx="10" fill="white" fillOpacity="0.15" />
    <path
      d="M10 12h16M18 12v14M13 18h10"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="8" fill="white" fillOpacity="0.2" />
    <path
      d="M5 8l2 2 4-4"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const features = [
  "Real-time task & delivery tracking",
  "Tasker verification & KYC management",
  "Withdrawal requests & wallet oversight",
  "End-to-end operations dashboard",
];

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    {open ? (
      <>
        <path
          d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      </>
    ) : (
      <>
        <path
          d="M2 2l14 14M7.5 4.2A7.7 7.7 0 0 1 9 4c5 0 8 5 8 5a14.5 14.5 0 0 1-2.4 3M5.3 5.3A14 14 0 0 0 1 9s3 5 8 5a7.7 7.7 0 0 0 3.7-.9"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M9 11.5a2.5 2.5 0 0 1-2.5-2.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </>
    )}
  </svg>
);

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email || !formData.password) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password.trim(),
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Authentication failed.");
        return;
      }

      // 🔥 Fetch role immediately
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();

      console.log("logged in user", user);
      console.log("user fetch result:", user, userError);

      if (!user) {
        setError("User profile not found.");
        return;
      }

      // 🔥 Role-based redirect
      if (user.role === "operator") {
        navigate("/operator/dashboard");
      } else {
        navigate("/dashboard"); // admin/coordinator
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .tura-login-root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          font-family: 'DM Sans', sans-serif;
          background: #f5f4f0;
        }

        /* ── LEFT PANEL ── */
        .tura-left {
          background: #1a5c3a;
          background-image:
            radial-gradient(ellipse 80% 60% at 20% 80%, rgba(255,255,255,0.04) 0%, transparent 70%),
            radial-gradient(ellipse 60% 80% at 80% 20%, rgba(0,0,0,0.15) 0%, transparent 70%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          position: relative;
          overflow: hidden;
        }

        .tura-left::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.025'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          pointer-events: none;
        }

        .tura-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        .tura-brand-name {
          font-family: 'Instrument Serif', serif;
          font-size: 22px;
          color: white;
          letter-spacing: -0.3px;
        }

        .tura-brand-badge {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
          background: rgba(255,255,255,0.1);
          padding: 3px 8px;
          border-radius: 4px;
          margin-top: 1px;
        }

        .tura-left-body {
          position: relative;
          z-index: 1;
        }

        .tura-left-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
          margin-bottom: 20px;
        }

        .tura-left-heading {
          font-family: 'Instrument Serif', serif;
          font-size: 42px;
          line-height: 1.15;
          color: white;
          margin-bottom: 32px;
          font-style: italic;
        }

        .tura-left-heading em {
          font-style: normal;
          color: #7fdba8;
        }

        .tura-features {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .tura-feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: rgba(255,255,255,0.75);
        }

        .tura-left-footer {
          position: relative;
          z-index: 1;
          font-size: 12px;
          color: rgba(255,255,255,0.3);
        }

        /* ── RIGHT PANEL ── */
        .tura-right {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          background: #f5f4f0;
        }

        .tura-form-card {
          width: 100%;
          max-width: 400px;
        }

        .tura-form-header {
          margin-bottom: 36px;
        }

        .tura-form-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #1a5c3a;
          margin-bottom: 10px;
        }

        .tura-form-title {
          font-family: 'Instrument Serif', serif;
          font-size: 34px;
          line-height: 1.2;
          color: #111;
          letter-spacing: -0.5px;
        }

        .tura-form-subtitle {
          margin-top: 8px;
          font-size: 14px;
          color: #888;
        }

        .tura-field {
          margin-bottom: 20px;
        }

        .tura-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #444;
          margin-bottom: 7px;
        }

        .tura-input-wrap {
          position: relative;
        }

        .tura-input {
          width: 100%;
          height: 48px;
          padding: 0 44px 0 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #111;
          background: white;
          border: 1.5px solid #e0ddd8;
          border-radius: 10px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          -webkit-appearance: none;
        }

        .tura-input::placeholder { color: #bbb; }

        .tura-input:hover { border-color: #c5c2bc; }

        .tura-input:focus {
          border-color: #1a5c3a;
          box-shadow: 0 0 0 3px rgba(26, 92, 58, 0.1);
        }

        .tura-input-suffix {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #aaa;
          cursor: pointer;
          display: flex;
          align-items: center;
          background: none;
          border: none;
          padding: 0;
          transition: color 0.15s;
        }

        .tura-input-suffix:hover { color: #555; }

        .tura-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 20px;
          font-size: 13px;
          color: #b91c1c;
        }

        .tura-error::before {
          content: '!';
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          background: #b91c1c;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          line-height: 16px;
          text-align: center;
          margin-top: 1px;
        }

        .tura-btn {
          width: 100%;
          height: 50px;
          background: #1a5c3a;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s, opacity 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          overflow: hidden;
        }

        .tura-btn:hover:not(:disabled) { background: #155030; }
        .tura-btn:active:not(:disabled) { transform: scale(0.99); }
        .tura-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .tura-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: tura-spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes tura-spin { to { transform: rotate(360deg); } }

        .tura-form-footer {
          margin-top: 28px;
          text-align: center;
          font-size: 12px;
          color: #aaa;
        }

        .tura-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0;
        }

        .tura-divider-line {
          flex: 1;
          height: 1px;
          background: #e8e5e0;
        }

        .tura-divider-text {
          font-size: 12px;
          color: #bbb;
          white-space: nowrap;
        }

        .tura-forgot {
          display: block;
          text-align: right;
          font-size: 12.5px;
          color: #1a5c3a;
          text-decoration: none;
          margin-top: -12px;
          margin-bottom: 20px;
          font-weight: 500;
          transition: opacity 0.15s;
        }

        .tura-forgot:hover { opacity: 0.7; }

        @media (max-width: 768px) {
          .tura-login-root {
            grid-template-columns: 1fr;
          }
          .tura-left {
            display: none;
          }
          .tura-right {
            padding: 32px 24px;
            justify-content: flex-start;
            padding-top: 60px;
          }
        }
      `}</style>

      <div className="tura-login-root">
        {/* Left Panel */}
        <div className="tura-left">
          <div className="tura-brand">
            <TuraLogo />
            <span className="tura-brand-name">Tura</span>
            <span className="tura-brand-badge">Admin</span>
          </div>

          <div className="tura-left-body">
            <p className="tura-left-eyebrow">Operations Command</p>
            <h1 className="tura-left-heading">
              Lagos logistics,
              <br />
              <em>under control.</em>
            </h1>
            <div className="tura-features">
              {features.map((f) => (
                <div className="tura-feature-item" key={f}>
                  <CheckIcon />
                  {f}
                </div>
              ))}
            </div>
          </div>

          <div className="tura-left-footer">
            © {new Date().getFullYear()} Tura Technologies Ltd · Lagos, Nigeria
          </div>
        </div>

        {/* Right Panel */}
        <div className="tura-right">
          <div className="tura-form-card">
            <div className="tura-form-header">
              <p className="tura-form-eyebrow">Secure Access</p>
              <h2 className="tura-form-title">Welcome back</h2>
              <p className="tura-form-subtitle">
                Sign in to your admin account to continue.
              </p>
            </div>

            <form onSubmit={handleLogin} noValidate>
              <div className="tura-field">
                <label className="tura-label" htmlFor="email">
                  Email address
                </label>
                <div className="tura-input-wrap">
                  <input
                    id="email"
                    className="tura-input"
                    type="email"
                    placeholder="you@tura.ng"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="tura-field">
                <label className="tura-label" htmlFor="password">
                  Password
                </label>
                <div className="tura-input-wrap">
                  <input
                    id="password"
                    className="tura-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="tura-input-suffix"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <a href="#" className="tura-forgot">
                Forgot password?
              </a>

              {error && <div className="tura-error">{error}</div>}

              <button type="submit" className="tura-btn" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="tura-spinner" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="tura-form-footer">
              Authorised personnel only · All activity is monitored and logged
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
