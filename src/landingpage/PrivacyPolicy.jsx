import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PRIVACY_POLICY_DEFAULTS } from '../Tools/AI_Legal/constants/legalDefaults';
import { Database, Lock, Shield, Eye, UserCheck, FileText, ArrowLeft } from 'lucide-react';
import { apiService } from '../services/apiService';
import { name } from '../constants';

const PrivacyPolicy = () => {
    const navigate = useNavigate();
    const [sections, setSections] = useState([]);
    const [lastUpdated, setLastUpdated] = useState("March 7, 2026");
    const [loading, setLoading] = useState(true);

    const getDynamicIcon = (index) => {
        const icons = [Database, Lock, Shield, Eye, UserCheck, FileText];
        return icons[index % icons.length] || FileText;
    };

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const data = await apiService.getLegalPage('privacy-policy');
                if (data && data.sections && data.sections.length > 0) {
                    const mappedSections = data.sections.map((s, i) => ({
                        ...s,
                        icon: getDynamicIcon(i)
                    }));
                    setSections(mappedSections);
                    if (data.lastUpdated) {
                        setLastUpdated(new Date(data.lastUpdated).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }));
                    }
                } else {
                    setSections([]);
                }
            } catch (err) {
                console.error("Failed to fetch dynamic policy:", err);
                setSections([]);
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, []);


    return (
        <div className="min-h-screen bg-[#0F172A] selection:bg-primary/30">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0F172A]/80 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate('/')}
                        className="flex items-center gap-2 text-subtext hover:text-primary transition-colors group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Back</span>
                    </button>
                    <h1 className="text-xl font-bold text-primary">{name} <sup className="text-xs">TM</sup></h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-12">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                        <Shield className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-maintext mb-4">
                        Privacy Policy
                    </h1>
                    <p className="text-lg text-subtext max-w-2xl mx-auto">
                        Your privacy matters to us. Learn how we collect, use, and protect your data.
                    </p>
                    <p className="text-sm text-subtext mt-4">
                        <strong>Last Updated:</strong> {lastUpdated}
                    </p>
                </motion.div>

                {/* Introduction */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[#18233A] rounded-[2rem] p-8 mb-8 border border-white/[0.06] shadow-xl"
                >
                    <p className="text-maintext leading-relaxed mb-4">
                        Welcome to {name}™ ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered intelligent assistant platform.
                    </p>
                    <p className="text-maintext leading-relaxed">
                        By using {name}™, you agree to the collection and use of information in accordance with this policy. We are committed to maintaining the highest standards of privacy and security for all our users.
                    </p>
                </motion.div>

                {/* Policy Sections */}
                <div className="space-y-6">
                    {sections.map((section, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * (index + 2) }}
                            className="bg-[#18233A] rounded-[2rem] p-8 border border-white/[0.06] shadow-xl hover:border-primary/20 transition-all group"
                        >
                            <div className="flex items-start gap-4 mb-6">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <section.icon className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-maintext mb-4">{section.title}</h2>
                                </div>
                            </div>

                            <div className="space-y-6 ml-16">
                                {section.content.map((item, idx) => (
                                    <div key={idx}>
                                        <h3 className="text-lg font-semibold text-maintext mb-2">{item.subtitle}</h3>
                                        <p className="text-subtext leading-relaxed">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Global Regulatory Compliance */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                    className="mt-8 bg-[#18233A] rounded-[2rem] p-8 border border-white/[0.06] shadow-xl"
                >
                    <h2 className="text-2xl font-bold text-maintext mb-4">Global Regulatory Compliance</h2>
                    <p className="text-subtext leading-relaxed mb-4">
                        AISA™ operates in compliance with major global data protection and privacy regulations. We are committed to upholding user rights across all jurisdictions.
                    </p>
                    <div className="space-y-3">
                        {[
                            { name: "General Data Protection Regulation (GDPR) — EU", url: "https://gdpr.eu/" },
                            { name: "California Consumer Privacy Act (CCPA) — USA", url: "https://oag.ca.gov/privacy/ccpa" },
                            { name: "PIPEDA — Canada", url: "https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/" },
                            { name: "Personal Data Protection Act (PDPA) — Singapore", url: "https://www.pdpc.gov.sg/overview-of-pdpa/the-legislation/personal-data-protection-act" },
                            { name: "Privacy Act 1988 — Australia", url: "https://www.oaic.gov.au/privacy/the-privacy-act" }
                        ].map((reg, i) => (
                            <a key={i} href={reg.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-xl transition-colors group">
                                <Shield className="w-5 h-5 text-primary shrink-0" />
                                <span className="text-sm text-maintext group-hover:text-primary transition-colors">{reg.name}</span>
                            </a>
                        ))}
                    </div>
                </motion.div>

                {/* Contact Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mt-12 bg-gradient-to-r from-primary/10 to-indigo-500/10 rounded-[2rem] p-8 border border-primary/20 shadow-xl"
                >
                    <h2 className="text-2xl font-bold text-maintext mb-4">Questions About Privacy?</h2>
                    <p className="text-subtext leading-relaxed mb-4">
                        If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
                    </p>
                    <div className="space-y-2 text-subtext">
                        <p><strong className="text-maintext">Email:</strong> <a href="mailto:admin@uwo24.com" className="text-primary hover:underline">admin@uwo24.com</a></p>
                        <p><strong className="text-maintext">Phone:</strong> <a href="tel:+918359890909" className="text-primary hover:underline">+91 83589 90909</a></p>
                        <p><strong className="text-maintext">Address:</strong> Jabalpur, Madhya Pradesh, India</p>
                    </div>
                </motion.div>

                {/* Policy Updates */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="mt-8 p-8 bg-primary/5 border border-primary/10 rounded-[2rem] shadow-inner"
                >
                    <h3 className="text-lg font-semibold text-maintext mb-2">Policy Updates</h3>
                    <p className="text-sm text-subtext leading-relaxed">
                        We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date. We encourage you to review this policy periodically for any changes.
                    </p>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="mt-20 py-12 border-t border-white/[0.06] bg-[#0F172A]">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <p className="text-sm text-subtext">
                        © {new Date().getFullYear()} {name}™. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default PrivacyPolicy;
