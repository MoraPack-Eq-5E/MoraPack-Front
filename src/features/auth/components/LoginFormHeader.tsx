/**
 * LoginFormHeader Component
 * Logo y título del formulario de login
 */

import { AUTH_MESSAGES } from '@/constants';

export function LoginFormHeader() {
  return (
    <div className="mb-8 text-center">
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#0066CC] rounded-lg flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-white"
              aria-hidden="true"
            >
              <path
                d="M21 16V8C21 7.45 20.55 7 20 7H4C3.45 7 3 7.45 3 8V16C3 16.55 3.45 17 4 17H20C20.55 17 21 16.55 21 16ZM20 5C21.66 5 23 6.34 23 8V16C23 17.66 21.66 19 20 19H4C2.34 19 1 17.66 1 16V8C1 6.34 2.34 5 4 5H20ZM12 9L7 12L12 15L17 12L12 9Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span className="text-2xl font-bold text-[#0066CC]">MoraPack</span>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {AUTH_MESSAGES.LOGIN.TITLE}
      </h1>
      <p className="text-gray-600">{AUTH_MESSAGES.LOGIN.SUBTITLE}</p>
    </div>
  );
}

