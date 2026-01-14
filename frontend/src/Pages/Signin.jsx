// src/pages/SignInPage.jsx
import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Mail,
  Key,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ArrowRight,
  Globe,
  Smartphone,
  User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { authAPI } from "../services/api";

export default function SignInPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Theme handling
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (isSignUp && !formData.firstName) {
      setError("First name is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError("");

    try {
      if (isSignUp) {
        // Register
        const name = `${formData.firstName} ${formData.lastName}`.trim();
        const response = await authAPI.register({
          name,
          email: formData.email,
          password: formData.password
        });

        if (response.success) {
          console.log("Registration successful:", response.user);
          navigate('/chat');
        }
      } else {
        // Login
        const response = await authAPI.login({
          email: formData.email,
          password: formData.password
        });

        if (response.success) {
          console.log("Login successful:", response.user);
          navigate('/chat');
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.response?.data?.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    console.log(`Signing in with ${provider}`);
    navigate('/chat');
  };

  // Theme config
  const theme = isDarkMode
    ? {
      bg: "bg-gray-900",
      panel: "bg-gray-800",
      text: "text-white",
      muted: "text-gray-400",
      input: "bg-gray-700 border-gray-600 text-white focus:border-cyan-500",
      button: "bg-cyan-600 hover:bg-cyan-700",
      accent: "text-cyan-400",
      gradient: "from-gray-900 to-gray-800"
    }
    : {
      bg: "bg-white",
      panel: "bg-white",
      text: "text-slate-900",
      muted: "text-slate-500",
      input: "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500",
      button: "bg-blue-600 hover:bg-blue-700",
      accent: "text-blue-600",
      gradient: "from-blue-50 to-white"
    };

  return (
    <div className={`min-h-screen w-full flex overflow-hidden relative ${theme.bg} ${theme.text} transition-colors duration-300`}>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-6 z-50 p-2 rounded-full shadow-lg transition-transform hover:scale-110 ${isDarkMode ? 'bg-cyan-600 text-white' : 'bg-blue-600 text-white'
          }`}
      >
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Main Layout Container */}
      <motion.div
        layout
        className={`w-full h-full flex flex-col md:flex-row ${isSignUp ? 'md:flex-row-reverse' : ''}`}
      >

        {/* Left Side (Form) - effectively moves based on flex-direction */}
        <motion.div
          layout
          className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center relative z-10"
        >
          <div className="max-w-md mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">
                  {isSignUp ? "Create Account" : "Welcome Back"}
                </h1>
                <p className={`${theme.muted}`}>
                  {isSignUp ? "Enter your details to get started" : "Please enter your details to sign in"}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {isSignUp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div>
                        <label className={`text-sm font-medium ${theme.muted} block mb-1.5`}>First Name</label>
                        <div className="relative">
                          <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.muted}`} />
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className={`w-full pl-10 pr-4 py-3 rounded-xl border ${theme.input} focus:outline-none focus:ring-2 focus:ring-opacity-50 outline-none transition-all`}
                            placeholder="John"
                          />
                        </div>
                      </div>
                      <div>
                        <label className={`text-sm font-medium ${theme.muted} block mb-1.5`}>Last Name</label>
                        <div className="relative">
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-3 rounded-xl border ${theme.input} focus:outline-none focus:ring-2 focus:ring-opacity-50 outline-none transition-all`}
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className={`text-sm font-medium ${theme.muted} block mb-1.5`}>Email</label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.muted}`} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border ${theme.input} focus:outline-none focus:ring-2 focus:ring-opacity-50 outline-none transition-all`}
                      placeholder="hello@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-medium ${theme.muted} block mb-1.5`}>Password</label>
                  <div className="relative">
                    <Key className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.muted}`} />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-12 py-3 rounded-xl border ${theme.input} focus:outline-none focus:ring-2 focus:ring-opacity-50 outline-none transition-all`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${theme.muted} hover:text-current`}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {!isSignUp && (
                  <div className="flex justify-end">
                    <button type="button" className={`text-sm font-medium ${theme.accent} hover:underline`}>
                      Forgot Password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${theme.button}`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {isSignUp ? "Create Account" : "Sign In"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className={`w-full border-t ${isDarkMode ? 'border-gray-700' : 'border-slate-200'}`}></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className={`px-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} ${theme.muted}`}>Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('Google')}
                    className={`p-3 rounded-xl border ${isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-slate-200 hover:bg-slate-50'} flex items-center justify-center gap-2 transition-colors`}
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-sm font-medium">Google</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('GitHub')}
                    className={`p-3 rounded-xl border ${isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-slate-200 hover:bg-slate-50'} flex items-center justify-center gap-2 transition-colors`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span className="text-sm font-medium">GitHub</span>
                  </button>
                </div>

                <div className="mt-8 text-center text-sm">
                  <span className={theme.muted}>
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className={`font-semibold ${theme.accent} hover:underline`}
                  >
                    {isSignUp ? "Sign In" : "Sign Up"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side (Info/Brand) */}
        <motion.div
          layout
          className={`hidden md:flex w-1/2 p-12 flex-col justify-between relative overflow-hidden transition-colors duration-500`}
        >
          {/* Background Gradient/Image */}
          <div className={`absolute inset-0 bg-gradient-to-br ${isDarkMode ? 'from-cyan-900 to-blue-900' : 'from-blue-600 to-cyan-500'}`}></div>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')] opacity-10 mix-blend-overlay bg-cover bg-center"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-wide">ChatFlow</span>
            </div>
          </div>

          <div className="relative z-10 max-w-lg">
            <motion.div
              key={isSignUp ? "signup-text" : "signin-text"}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                {isSignUp
                  ? "Join our community of millions."
                  : "Connect with friends and family instantly."}
              </h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                {isSignUp
                  ? "Experience the future of messaging with end-to-end encryption, high-quality calls, and instant syncing across all your devices."
                  : "Pick up right where you left off. Your conversations are synced across all devices for a seamless experience."}
              </p>
            </motion.div>
          </div>

          <div className="relative z-10 text-blue-200 text-sm">
            © 2026 ChatFlow Inc.
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}