/**
 * GooglePayButton.jsx
 * ────────────────────
 * A complete, production-ready Google Pay button for React.
 *
 * HOW IT WORKS:
 * 1. Component loads → loads Google Pay JS SDK from Google's CDN
 * 2. Checks if user's device/browser supports Google Pay
 * 3. Shows the official Google Pay button (required by Google's branding rules)
 * 4. When user clicks → calls your backend to create a Razorpay order
 * 5. Opens Google Pay payment sheet
 * 6. User approves → your backend verifies & activates the plan
 *
 * USAGE:
 * <GooglePayButton
 *   planId="abc123"
 *   billingCycle="monthly"
 *   amount={499}
 *   currency="INR"
 *   onSuccess={(data) => console.log('Plan activated!', data)}
 *   onError={(err) => console.error(err)}
 * />
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createGooglePayOrder, verifyGooglePayment } from '../services/walletPayment.service.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const GOOGLE_PAY_SDK_URL = 'https://pay.google.com/gp/p/js/pay.js';
const GOOGLE_PAY_ENV = import.meta.env.VITE_GOOGLE_PAY_ENV || 'TEST';
const MERCHANT_ID = import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID;

// ─── Main Component ─────────────────────────────────────────────────────────

const GooglePayButton = ({
    planId,
    packageId,
    billingCycle = 'monthly',
    amount,
    currency = 'INR',
    onSuccess,
    onError,
    disabled = false,
    className = ''
}) => {
    const containerRef = useRef(null);
    const paymentsClientRef = useRef(null);
    const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'not-supported' | 'paying' | 'error'
    const [errorMsg, setErrorMsg] = useState('');

    // ── 1. Load Google Pay SDK script ────────────────────────────────────────
    useEffect(() => {
        if (window.google?.payments?.api) {
            initializeGooglePay();
            return;
        }

        const existingScript = document.querySelector(`script[src="${GOOGLE_PAY_SDK_URL}"]`);
        if (existingScript) {
            existingScript.addEventListener('load', initializeGooglePay);
            return;
        }

        const script = document.createElement('script');
        script.src = GOOGLE_PAY_SDK_URL;
        script.async = true;
        script.onload = initializeGooglePay;
        script.onerror = () => setStatus('not-supported');
        document.head.appendChild(script);

        return () => {
            script.removeEventListener('load', initializeGooglePay);
        };
    }, []);

    // ── 2. Initialize Google Pay client & check if supported ─────────────────
    const initializeGooglePay = useCallback(async () => {
        try {
            const paymentsClient = new window.google.payments.api.PaymentsClient({
                environment: GOOGLE_PAY_ENV // 'TEST' or 'PRODUCTION'
            });

            paymentsClientRef.current = paymentsClient;

            const isReadyToPay = await paymentsClient.isReadyToPay({
                apiVersion: 2,
                apiVersionMinor: 0,
                allowedPaymentMethods: [{
                    type: 'CARD',
                    parameters: {
                        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                        allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA']
                    }
                }]
            });

            if (isReadyToPay.result) {
                setStatus('ready');
            } else {
                setStatus('not-supported');
            }
        } catch (err) {
            console.warn('[GooglePay] Not available:', err.message);
            setStatus('not-supported');
        }
    }, []);

    // ── 3. Handle the full payment flow ──────────────────────────────────────
    const handleGooglePay = useCallback(async () => {
        if (!paymentsClientRef.current || status !== 'ready' || disabled) return;

        setStatus('paying');
        setErrorMsg('');

        try {
            // Call your backend to get orderId + googlePayConfig
            const orderData = await createGooglePayOrder({ planId, packageId, billingCycle, currency });

            if (orderData.isFree) {
                // Free plan — no payment needed
                onSuccess?.({ isFree: true });
                setStatus('ready');
                return;
            }

            // Open the Google Pay payment sheet
            const paymentData = await paymentsClientRef.current.loadPaymentData(orderData.googlePayConfig);

            // paymentData contains the encrypted payment token from Google
            // Razorpay handles this token on the backend
            const paymentToken = paymentData.paymentMethodData?.tokenizationData?.token;
            const parsedToken = typeof paymentToken === 'string' ? JSON.parse(paymentToken) : paymentToken;

            // Verify payment on your backend → activates subscription
            const result = await verifyGooglePayment({
                razorpay_order_id: orderData.orderId,
                razorpay_payment_id: parsedToken?.razorpay_payment_id || `gpay_${Date.now()}`,
                razorpay_signature: parsedToken?.razorpay_signature || '',
                planId,
                packageId,
                billingCycle
            });

            onSuccess?.(result);
            setStatus('ready');
        } catch (err) {
            // Google Pay cancelled by user — not really an error
            if (err?.statusCode === 'CANCELED' || err?.message?.includes('CANCELED')) {
                console.log('[GooglePay] Payment cancelled by user.');
                setStatus('ready');
                return;
            }

            console.error('[GooglePay] Payment error:', err);
            const msg = err.message || 'Payment failed. Please try again.';
            setErrorMsg(msg);
            setStatus('error');
            onError?.(err);

            // Auto reset after 4 seconds
            setTimeout(() => {
                setStatus('ready');
                setErrorMsg('');
            }, 4000);
        }
    }, [status, disabled, planId, packageId, billingCycle, currency, onSuccess, onError]);

    // ── 4. Render ─────────────────────────────────────────────────────────────
    if (status === 'not-supported') return null; // Hide button if Google Pay not supported

    return (
        <div className={`gpay-button-wrapper ${className}`}>
            {status === 'loading' && (
                <div className="gpay-skeleton" aria-label="Loading Google Pay...">
                    <div className="gpay-skeleton-inner" />
                </div>
            )}

            {(status === 'ready' || status === 'paying' || status === 'error') && (
                <button
                    id="google-pay-button"
                    className={`gpay-btn ${status === 'paying' ? 'gpay-btn--loading' : ''} ${status === 'error' ? 'gpay-btn--error' : ''}`}
                    onClick={handleGooglePay}
                    disabled={status === 'paying' || disabled}
                    aria-label="Pay with Google Pay"
                    type="button"
                >
                    {status === 'paying' ? (
                        <>
                            <span className="gpay-spinner" />
                            <span>Processing…</span>
                        </>
                    ) : status === 'error' ? (
                        <>
                            <span className="gpay-icon-error">✕</span>
                            <span>Try Again</span>
                        </>
                    ) : (
                        <>
                            {/* Official Google Pay logo (SVG inline — no external image needed) */}
                            <svg className="gpay-logo" viewBox="0 0 41 17" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M19.526 2.635v4.083h2.518c.6 0 1.096-.202 1.488-.605.403-.402.605-.882.605-1.437 0-.544-.202-1.018-.605-1.422-.392-.413-.888-.62-1.488-.62h-2.518zm0 5.52v4.736h-1.504V1.198h3.99c1.013 0 1.873.337 2.582 1.012.72.675 1.08 1.497 1.08 2.466 0 .991-.36 1.819-1.08 2.482-.697.652-1.559.978-2.583.978h-2.485zm7.668 2.287c0 .566.178 1.034.535 1.404.357.37.82.555 1.39.555.826 0 1.469-.392 1.927-1.176l1.317.88c-.676 1.045-1.692 1.568-3.048 1.568-1.016 0-1.83-.317-2.44-.95-.61-.644-.915-1.476-.915-2.496 0-.99.312-1.814.937-2.47.625-.657 1.428-.985 2.408-.985 1.016 0 1.832.38 2.448 1.14.627.76.94 1.657.94 2.69l-5.499 1.84zm3.702-3.41c-.35-.398-.82-.597-1.41-.597-.566 0-1.062.202-1.488.606-.414.404-.636.924-.663 1.558l3.56-1.567z" fill="#fff"/>
                                <path d="M5.9 8.51v2.96H4.397V1.198h3.875c.93 0 1.724.312 2.385.937.672.625 1.008 1.39 1.008 2.297 0 .928-.336 1.7-1.008 2.314-.65.604-1.444.906-2.385.906H5.9zm0-5.876V7.07h2.407c.566 0 1.04-.19 1.42-.57.392-.38.588-.852.588-1.415 0-.555-.196-1.022-.588-1.402-.38-.39-.854-.584-1.42-.584H5.9z" fill="#fff"/>
                                <path d="M17.502 5.674c-.37-.35-.886-.527-1.55-.527-.795 0-1.44.308-1.935.924L12.71 5.19c.718-.938 1.738-1.407 3.06-1.407.977 0 1.796.265 2.454.794.668.53 1.002 1.268 1.002 2.215v4.685h-1.432v-.993h-.057c-.586.827-1.397 1.24-2.434 1.24-.827 0-1.518-.247-2.074-.74-.545-.494-.817-1.117-.817-1.87 0-.793.3-1.42.9-1.88.61-.47 1.424-.706 2.443-.706.874 0 1.593.157 2.157.47l-.41-.324zm-3.498 3.61c0 .38.16.696.48.948.32.253.696.38 1.13.38.61 0 1.15-.227 1.62-.683.48-.456.72-.99.72-1.604-.45-.357-1.08-.535-1.885-.535-.587 0-1.076.142-1.467.426-.38.284-.57.644-.57 1.068z" fill="#fff"/>
                                <path d="M26.248 3.998l-4.757 10.99H20.01l1.765-3.818-3.14-7.172h1.59l2.258 5.506h.033l2.193-5.506z" fill="#fff"/>
                                <g>
                                    <path d="M38.71 8.42c0 2.57-2.25 4.665-5.04 4.665-2.78 0-5.04-2.094-5.04-4.665s2.26-4.664 5.04-4.664c2.79 0 5.04 2.094 5.04 4.664z" fill="#4285F4"/>
                                    <path d="M38.71 8.42c0 2.57-1.95 4.664-4.34 4.664V3.756c2.39 0 4.34 2.094 4.34 4.664z" fill="#34A853"/>
                                    <path d="M33.67 12.17c-2.38 0-4.34-1.66-4.34-3.75 0-2.08 1.96-3.75 4.34-3.75v7.5z" fill="#EA4335"/>
                                    <path d="M29.33 8.42c0-2.08 1.96-3.75 4.34-3.75v3.75H29.33z" fill="#FBBC05"/>
                                </g>
                            </svg>
                            <span className="gpay-btn-label">Pay</span>
                        </>
                    )}
                </button>
            )}

            {errorMsg && (
                <p className="gpay-error-text" role="alert">{errorMsg}</p>
            )}

            <style>{`
                .gpay-button-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 6px;
                    width: 100%;
                }

                .gpay-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    width: 100%;
                    min-height: 48px;
                    padding: 10px 20px;
                    background: #000;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-family: 'Google Sans', 'Roboto', sans-serif;
                    font-size: 15px;
                    font-weight: 600;
                    color: #fff;
                    letter-spacing: 0.25px;
                    transition: background 0.2s, box-shadow 0.2s, opacity 0.2s, transform 0.1s;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.28);
                    position: relative;
                    overflow: hidden;
                }

                .gpay-btn:hover:not(:disabled) {
                    background: #1a1a1a;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                    transform: translateY(-1px);
                }

                .gpay-btn:active:not(:disabled) {
                    transform: translateY(0);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                }

                .gpay-btn:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                }

                .gpay-btn--loading {
                    background: #1a1a1a;
                    pointer-events: none;
                }

                .gpay-btn--error {
                    background: #c0392b;
                }

                .gpay-logo {
                    width: 60px;
                    height: auto;
                    flex-shrink: 0;
                }

                .gpay-btn-label {
                    font-size: 15px;
                    color: #fff;
                }

                .gpay-spinner {
                    width: 18px;
                    height: 18px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: gpay-spin 0.75s linear infinite;
                    flex-shrink: 0;
                }

                .gpay-icon-error {
                    font-size: 16px;
                    font-weight: 700;
                }

                .gpay-error-text {
                    font-size: 12px;
                    color: #e74c3c;
                    text-align: center;
                    margin: 0;
                    padding: 0 4px;
                }

                .gpay-skeleton {
                    width: 100%;
                    min-height: 48px;
                    border-radius: 10px;
                    overflow: hidden;
                    background: rgba(255,255,255,0.06);
                }

                .gpay-skeleton-inner {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
                    background-size: 200% 100%;
                    animation: gpay-shimmer 1.4s infinite;
                    min-height: 48px;
                }

                @keyframes gpay-spin {
                    to { transform: rotate(360deg); }
                }

                @keyframes gpay-shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
        </div>
    );
};

export default GooglePayButton;
