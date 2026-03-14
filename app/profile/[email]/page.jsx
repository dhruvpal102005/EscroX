'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getReviewsForUser } from '@/lib/firestore';
import { Star, ArrowLeft, Globe } from 'lucide-react';

export default function PublicProfilePage() {
    const { email } = useParams();
    const decodedEmail = decodeURIComponent(email);

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!decodedEmail) return;
        getReviewsForUser(decodedEmail)
            .then(setReviews)
            .catch(() => setReviews([]))
            .finally(() => setLoading(false));
    }, [decodedEmail]);

    const avgRating = reviews.length > 0
        ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
        : null;

    const renderStars = (count) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} size={16}
                    fill={count >= n ? '#f5a623' : 'none'}
                    stroke={count >= n ? '#f5a623' : '#cbd5e1'}
                />
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f7f7f5]">
            <Navbar />
            <div className="max-w-3xl mx-auto px-6 py-16 pt-28">

                {/* Back */}
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-8">
                    <ArrowLeft size={14} /> Back
                </Link>

                {/* Profile Header */}
                <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden border-4 border-[#f5a623] shrink-0">
                        <img
                            src={`https://api.dicebear.com/7.x/notionists/svg?seed=${decodedEmail}&backgroundColor=e2e8f0`}
                            alt={decodedEmail}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <h1 className="text-2xl font-black text-slate-900 mb-1">{decodedEmail.split('@')[0]}</h1>
                        <p className="text-sm text-slate-400 flex items-center justify-center sm:justify-start gap-1 mb-4">
                            <Globe size={13} /> {decodedEmail}
                        </p>
                        {avgRating ? (
                            <div className="flex items-center gap-3 justify-center sm:justify-start">
                                <span className="text-3xl font-black text-slate-900">{avgRating}</span>
                                {renderStars(Math.round(parseFloat(avgRating)))}
                                <span className="text-sm text-slate-400">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">No reviews yet</p>
                        )}
                    </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-16 text-slate-400">Loading reviews...</div>
                    ) : reviews.length === 0 ? (
                        <div className="bg-white rounded-[24px] p-12 shadow-sm border border-slate-100 text-center">
                            <Star size={36} stroke="#cbd5e1" fill="none" className="mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-slate-900 mb-1">No reviews yet</h3>
                            <p className="text-sm text-slate-400">Reviews from completed contracts will appear here.</p>
                        </div>
                    ) : (
                        reviews.map((r, i) => (
                            <div key={i} className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">{r.reviewerName}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            on <span className="text-slate-600 font-medium">{r.contractTitle}</span>
                                        </p>
                                    </div>
                                    <div className="shrink-0">
                                        {renderStars(r.rating)}
                                    </div>
                                </div>
                                {r.comment && (
                                    <p className="text-sm text-slate-600 italic border-l-2 border-[#f5a623] pl-3">"{r.comment}"</p>
                                )}
                                {r.createdAt?.toDate && (
                                    <p className="text-[10px] text-slate-300 mt-3">
                                        {r.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
