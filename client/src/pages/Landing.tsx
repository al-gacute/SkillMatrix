import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AcademicCapIcon,
    ArrowRightIcon,
    ChartBarSquareIcon,
    ClipboardDocumentCheckIcon,
    HandThumbUpIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import AppLogo from '../components/AppLogo';

const storySections = [
    {
        id: 'discover',
        eyebrow: 'See Skills Clearly',
        title: 'Build a living skills matrix, not a static spreadsheet.',
        description:
            'Track proficiency, years of experience, experience entries, and endorsements in one place so capability becomes visible across the organization.',
        bullets: ['Public and private skill visibility', 'Experience entries for proof and context', 'Endorsements grounded in actual matrix data'],
        icon: AcademicCapIcon,
    },
    {
        id: 'review',
        eyebrow: 'Run Better Reviews',
        title: 'Assessments and feedback stay tied to actual skills.',
        description:
            'Managers can review members through matrix-based assessments, while feedback and acknowledgement flows make progress easier to track over time.',
        bullets: ['Role-aware assessment flow', 'Acknowledgement tracking for reviews', 'Period and type-based review history'],
        icon: ClipboardDocumentCheckIcon,
    },
    {
        id: 'recognize',
        eyebrow: 'Recognize Growth',
        title: 'Peer recognition and improvement signals stay visible.',
        description:
            'Give endorsements, send feedback, and surface strengths or improvement opportunities in a way that supports development rather than guesswork.',
        bullets: ['Browse other members’ public matrices', 'Endorse skills in context', 'Track strengths and growth feedback over time'],
        icon: HandThumbUpIcon,
    },
    {
        id: 'analyze',
        eyebrow: 'Understand the Org',
        title: 'Analytics turn structure and talent data into action.',
        description:
            'Dashboards for users and admins highlight readiness, workload, and skill signals so leaders can act before small gaps become bigger issues.',
        bullets: ['User analytics for progression and review status', 'Admin reporting for system health and org readiness', 'Clearer visibility into teams, sections, and departments'],
        icon: ChartBarSquareIcon,
    },
];

const cubeColors = {
    white: '#FFFFFF',
    yellow: '#FACC15',
    red: '#EF4444',
    orange: '#F97316',
    blue: '#3B82F6',
    green: '#22C55E',
    indigo: '#6366F1',
    emerald: '#34D399',
    pink: '#EC4899',
};

const cubeFaces = {
    front: [cubeColors.red, cubeColors.blue, cubeColors.yellow, cubeColors.green, cubeColors.white, cubeColors.orange, cubeColors.indigo, cubeColors.emerald, cubeColors.pink],
    back: [cubeColors.orange, cubeColors.indigo, cubeColors.white, cubeColors.yellow, cubeColors.red, cubeColors.blue, cubeColors.green, cubeColors.pink, cubeColors.emerald],
    left: [cubeColors.blue, cubeColors.white, cubeColors.red, cubeColors.emerald, cubeColors.yellow, cubeColors.orange, cubeColors.indigo, cubeColors.green, cubeColors.pink],
    right: [cubeColors.green, cubeColors.orange, cubeColors.yellow, cubeColors.red, cubeColors.blue, cubeColors.white, cubeColors.pink, cubeColors.indigo, cubeColors.emerald],
    top: [cubeColors.white, cubeColors.red, cubeColors.blue, cubeColors.yellow, cubeColors.green, cubeColors.orange, cubeColors.pink, cubeColors.emerald, cubeColors.indigo],
    bottom: [cubeColors.yellow, cubeColors.green, cubeColors.orange, cubeColors.white, cubeColors.blue, cubeColors.red, cubeColors.emerald, cubeColors.indigo, cubeColors.pink],
};

type CubeFaceName = keyof typeof cubeFaces;

const Landing: React.FC = () => {
    const [scrollY, setScrollY] = useState(0);
    const [activeSection, setActiveSection] = useState(storySections[0].id);

    useEffect(() => {
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-story-section]'));
        if (sections.length === 0) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntry = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

                if (visibleEntry?.target?.id) {
                    setActiveSection(visibleEntry.target.id);
                }
            },
            {
                threshold: [0.35, 0.55, 0.75],
                rootMargin: '-10% 0px -20% 0px',
            }
        );

        sections.forEach((section) => observer.observe(section));

        return () => observer.disconnect();
    }, []);

    const cubeTransform = useMemo(() => {
        const rotateX = 18 + scrollY * 0.06;
        const rotateY = -28 + scrollY * 0.14;
        const rotateZ = scrollY * 0.025;
        return `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
    }, [scrollY]);

    const cubePreview = (
        <div className="relative flex justify-center py-6">
            <div className="landing-glow absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.3),_transparent_62%)] blur-2xl" />
            <div className="relative">
                <div className="rubiks-scene">
                    <div className="rubiks-cube" style={{ transform: cubeTransform }}>
                        <div className="rubiks-core">
                            {(['front', 'back', 'left', 'right', 'top', 'bottom'] as CubeFaceName[]).map((face) => (
                                <span key={`core-${face}`} className={`rubiks-core-face rubiks-core-face-${face}`} />
                            ))}
                        </div>
                        {Object.entries(cubeFaces).map(([face, colors]) => (
                            <div key={face} className={`rubiks-face rubiks-face-${face}`}>
                                {colors.map((color, index) => (
                                    <span
                                        key={`${face}-${index}`}
                                        className="rubiks-tile"
                                        style={{ background: color }}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.25),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_42%,_#ffffff_100%)] text-slate-900">
            <div className="pointer-events-none fixed right-2 top-24 z-10 hidden w-[18rem] lg:block xl:right-4 xl:w-[24rem] 2xl:right-10 2xl:w-[26rem]">
                <div className="pointer-events-auto relative">
                    {cubePreview}
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pr-[20rem] xl:pr-[24rem] 2xl:pr-[28rem]">
                <header className="flex items-center justify-between gap-4 rounded-full border border-white/70 bg-white/80 px-4 py-3 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur md:px-6">
                    <div className="flex items-center">
                        <AppLogo />
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="btn-secondary rounded-full px-5">
                            Sign In
                        </Link>
                        <Link to="/register" className="btn-primary rounded-full px-5">
                            Create Account
                        </Link>
                    </div>
                </header>

                <section className="pt-12">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                            <SparklesIcon className="h-4 w-4" />
                            Skills, feedback, assessments, and analytics in one view
                        </div>
                        <h1 className="mt-6 max-w-3xl font-serif text-5xl font-semibold leading-tight text-slate-950 sm:text-6xl">
                            See what your people can do, and help them grow with evidence.
                        </h1>
                        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                            SkillMatrix helps organizations map capability, capture experience, run matrix-based assessments,
                            collect feedback, and surface meaningful analytics across users, teams, and leadership.
                        </p>

                        <div className="mt-10 grid gap-4 sm:grid-cols-3">
                            <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur">
                                <p className="text-sm font-medium text-slate-500">Track</p>
                                <p className="mt-2 text-3xl font-bold text-slate-950">9-Level</p>
                                <p className="mt-1 text-sm text-slate-600">Guided proficiency model</p>
                            </div>
                            <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur">
                                <p className="text-sm font-medium text-slate-500">Review</p>
                                <p className="mt-2 text-3xl font-bold text-slate-950">Role-Based</p>
                                <p className="mt-1 text-sm text-slate-600">Assessment and hierarchy flows</p>
                            </div>
                            <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur">
                                <p className="text-sm font-medium text-slate-500">Analyze</p>
                                <p className="mt-2 text-3xl font-bold text-slate-950">Actionable</p>
                                <p className="mt-1 text-sm text-slate-600">Dashboards for users and admins</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-10 lg:hidden">
                    {cubePreview}
                </section>

                <section className="mt-24 space-y-8">
                    {storySections.map((section) => {
                        const Icon = section.icon;
                        const isActive = section.id === activeSection;

                        return (
                            <article
                                key={section.id}
                                id={section.id}
                                data-story-section
                                className={`rounded-[2rem] border p-8 shadow-[0_16px_50px_rgba(15,23,42,0.08)] transition-all duration-300 lg:p-10 ${
                                    isActive
                                        ? 'border-slate-900 bg-white'
                                        : 'border-slate-200/80 bg-white/80'
                                }`}
                            >
                                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                                    <div className={`rounded-3xl p-4 ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                        <Icon className="h-7 w-7" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{section.eyebrow}</p>
                                        <h2 className="mt-3 max-w-3xl text-3xl font-semibold text-slate-950">{section.title}</h2>
                                        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{section.description}</p>
                                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                                            {section.bullets.map((bullet) => (
                                                <div key={bullet} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium leading-6 text-slate-700">
                                                    {bullet}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>

                <section className="mt-24 rounded-[2rem] bg-slate-950 px-8 py-10 text-white shadow-[0_20px_70px_rgba(15,23,42,0.2)]">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Built For Clarity</p>
                            <h2 className="mt-3 text-4xl font-semibold">One platform for capability mapping, feedback, and growth.</h2>
                            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
                                Start with the matrix, grow with real experience, and support development with role-aware assessments,
                                endorsements, and analytics that reflect what is actually happening in the organization.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Link to="/register" className="flex w-full items-center justify-center rounded-full bg-blue-500 px-6 py-4 text-base font-semibold text-white transition hover:bg-blue-400">
                                Create Your Account
                                <ArrowRightIcon className="ml-2 h-5 w-5" />
                            </Link>
                            <Link to="/login" className="flex w-full items-center justify-center rounded-full border border-white/20 px-6 py-4 text-base font-semibold text-white transition hover:bg-white/5">
                                Sign In
                            </Link>
                            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-300">
                                Registration stays approval-based, so admins can keep organizational setup clean from the start.
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="pb-4 pt-10 text-center text-sm text-slate-500">
                    SkillMatrix helps teams map mastery, recognize growth, and make development more visible.
                </footer>
            </div>
        </div>
    );
};

export default Landing;
