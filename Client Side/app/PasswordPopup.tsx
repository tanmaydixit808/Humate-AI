import React, { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

interface PasswordPopupProps {
  onCorrectPassword: () => void;
}

export function PasswordPopup({ onCorrectPassword }: PasswordPopupProps) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!isChecked) {
      setError('Please complete the captcha');
      setIsLoading(false);
      return;
    }

    if (credentials.username === process.env.NEXT_PUBLIC_APP_USERNAME && 
        credentials.password === process.env.NEXT_PUBLIC_APP_PASSWORD) {
      localStorage.setItem('isAuthenticated', 'true');
      onCorrectPassword();
    } else {
      setError('Incorrect username or password');
      setIsChecked(false);
      recaptchaRef.current?.reset();
    }
    setIsLoading(false);
  };

  const handleCheckboxClick = () => {
    setShowCaptcha(true);
  };

  const handleCaptchaChange = (token: string | null) => {
    if (token) {
      setIsChecked(true);
      setShowCaptcha(false);
    } else {
      setError('Please complete the captcha');
      setIsChecked(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/5 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div 
        className="p-8 sm:p-10 rounded-[12px] shadow-xl w-full max-w-[480px] border border-white/20 relative overflow-hidden bg-transparent min-h-[520px] flex flex-col"
        style={{
          backgroundImage: 'url(/bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0"></div>
        
        <div className="relative flex-1 flex flex-col">
          <div className="mb-16 text-center">
            <h2 className="text-[30px] sm:text-[26px] leading-7 sm:leading-8 font-bold text-white mb-3 tracking-[-0.01em]">
              Authentication Required
            </h2>
            <p className="text-[16px] leading-5 text-white/70 px-[5%]">
              Shiv Singh enter credentials to access your personal AI Voice Agent
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col justify-center">
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-5 py-3 font- rounded-md border border-white/30 bg-white/5 backdrop-blur-sm text-[15px] leading-tight text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/50 focus:border-white/50 transition-colors"
                  placeholder="Username"
                />
              </div>
              <div>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-5 py-3 rounded-md border border-white/30 bg-white/5 backdrop-blur-sm text-[15px] leading-tight text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/50 focus:border-white/50 transition-colors"
                  placeholder="Password"
                />
              </div>
            </div>

            <div className="relative">
              <div 
                onClick={handleCheckboxClick}
                className={`flex items-center space-x-2 p-2 cursor-pointer rounded-md border border-white/30 bg-white/5 backdrop-blur-sm ${isChecked ? 'border-white/50' : ''}`}
              >
                <div className={`w-5 h-5 rounded border border-white/30 flex items-center justify-center ${isChecked ? 'bg-white/10' : 'bg-white/5'}`}>
                  {isChecked && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-white/70 text-sm">I'm not a robot</span>
              </div>

              {showCaptcha && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20">
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                      onChange={handleCaptchaChange}
                      theme="dark"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto">
              {error && (
                <div className="bg-red-500/10 backdrop-blur-sm text-[14px] leading-5 text-red-200 py-2.5 px-4 rounded-md border border-red-500/30 mb-4">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !isChecked}
                className="w-full bg-white/5 backdrop-blur-sm border border-white/30 text-white text-[16px] leading-tight font-medium py-3 px-5 rounded-md transition-all hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="tracking-[-0.01em]">Authenticating...</span>
                  </span>
                ) : <span className="tracking-[-0.01em]">CONTINUE</span>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}