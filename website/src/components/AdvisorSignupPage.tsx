import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "motion/react";

const AdvisorSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUpAdvisor, signIn } = useAuth();
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", city: "", ria_number: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await signUpAdvisor(form);
      await signIn(form.email, form.password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fields = [
    { key: "name", label: "Full Name", type: "text", placeholder: "Dr. Priya Sharma", required: true },
    { key: "email", label: "Email Address", type: "email", placeholder: "priya@advisor.com", required: true },
    { key: "password", label: "Create Password", type: "password", placeholder: "Min. 8 characters", required: true },
    { key: "phone", label: "Phone Number", type: "tel", placeholder: "+91 98765 43210", required: false },
    { key: "city", label: "City", type: "text", placeholder: "Mumbai", required: false },
    { key: "ria_number", label: "SEBI RIA Number", type: "text", placeholder: "INH000099999", required: false },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg"
      >
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <img src="/cognivest-logo-monochrome.svg" alt="CogniVest" className="h-8 w-8 dark:invert" />
              <span className="text-xl font-bold tracking-tight text-foreground">CogniVest</span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Portfolio Manager Signup</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Join CogniVest to leverage AI-powered behavioral digital twins for your clients.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  {f.label}
                  {!f.required && <span className="text-muted-foreground ml-1">(optional)</span>}
                </label>
                <input
                  type={f.type}
                  required={f.required}
                  value={(form as any)[f.key]}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/50 text-foreground text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold text-sm hover:from-purple-500 hover:to-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create Advisor Account"
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
              Sign in
            </Link>
            {" · "}
            <Link to="/signup/client" className="text-blue-400 hover:text-blue-300 transition-colors">
              Sign up as Client
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdvisorSignupPage;
