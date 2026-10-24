import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import GoogleCompletePage from "./pages/GoogleCompletePage";
import ProfileOnboardingPage from "./pages/onboarding/ProfileOnboardingPage";
import InterestsOnboardingPage from "./pages/onboarding/InterestsOnboardingPage";
import InterestQuestionsPage from "./pages/onboarding/InterestQuestionsPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";

const photos = {
  aarohi: "/images/aarohi-reference.png",
  aarohiProfile: "/images/aarohi-profile-reference.png",
  meera: "/images/meera-reference.png",
  riya: "/images/riya-reference.png",
  neha: "/images/neha-reference.png",
  rohan: "/images/rohan-reference.png",
  aditya: "/images/aditya-reference.png",
  shashank: "/images/shashank-reference.png",
  hero: "/images/hero-reference.png",
  notebook: "/images/notebook-reference.png?v=3",
};

function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2" /></>,
    bookmark: <path d="M6 3h12v18l-6-4-6 4V3Z" />,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    leaf: <><path d="M12 22V9" /><path d="M12 13C5 13 3 8 3 3c6 0 9 3 9 10Z" /><path d="M12 17c7 0 9-5 9-10-6 0-9 3-9 10Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5h8v2M3 12h18M10 12v2h4v-2" /></>,
    school: <><path d="m2 10 10-5 10 5-10 5L2 10Z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></>,
    coffee: <><path d="M4 7h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V7Z" /><path d="M16 9h2a3 3 0 0 1 0 6h-2M7 3v2M11 3v2" /></>,
    people: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M14 15a5 5 0 0 1 7 4v1" /></>,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>,
    linkedin: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 11v6M8 8v.01M12 17v-6M12 14a3 3 0 0 1 6 0v3" /></>,
    youtube: <><path d="M22 12s0-4-1-5-5-1-9-1-8 0-9 1-1 5-1 5 0 4 1 5 5 1 9 1 8 0 9-1 1-5 1-5Z" /><path d="m10 9 5 3-5 3V9Z" /></>,
    x: <><path d="M5 4l14 16M19 4 5 20" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Logo() {
  return (
    <a className="logo" href="#top" aria-label="Saanjh home">
      <span className="logo-mark"><i /><i /><i /></span>
      <span>Saanjh</span>
    </a>
  );
}

function Arrow() {
  return <span className="arrow">→</span>;
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return <button className="primary-button">{children}<Arrow /></button>;
}

function Ring({ value, label = "" }: { value: number; label?: string }) {
  return (
    <div className="ring" style={{ "--score": `${value * 3.6}deg` } as React.CSSProperties}>
      <div><strong>{value}%</strong>{label && <small>{label}</small>}</div>
    </div>
  );
}

const metricData = [
  ["heart", "Values", 95],
  ["user", "Personality", 88],
  ["leaf", "Interests", 90],
  ["calendar", "Lifestyle", 85],
] as const;

function Metrics() {
  return (
    <div className="metrics">
      {metricData.map(([icon, label, score]) => (
        <div className="metric" key={label}>
          <span className={`metric-icon ${icon}`}><Icon name={icon} size={22} /></span>
          <span>{label}</span>
          <div className="bar"><i style={{ width: `${score}%` }} /></div>
          <strong>{score}%</strong>
        </div>
      ))}
    </div>
  );
}

function Tags({ items }: { items: string[] }) {
  return <div className="tags">{items.map((item) => <span key={item}>{item}</span>)}</div>;
}

const matches = [
  { name: "Aarohi", age: 24, city: "Bangalore, India", score: 92, tags: ["Travel", "Books", "Good Food"], bio: "Loves exploring new places, meaningful conversations and weekend getaways.", photo: photos.aarohi },
  { name: "Rohan", age: 26, city: "Delhi, India", score: 88, tags: ["Tech", "Music", "Fitness"], bio: "Enjoys long walks, music, and building cool ideas together.", photo: photos.rohan },
  { name: "Meera", age: 25, city: "Pune, India", score: 85, tags: ["Art", "Nature", "Coffee"], bio: "Passionate about art, nature and deep conversations.", photo: photos.meera },
];

function MatchCard({ match }: { match: (typeof matches)[number] }) {
  return (
    <article className="match-card">
      <img src={match.photo} alt={`${match.name}, ${match.age}`} />
      <div className="match-info">
        <div className="match-title"><div><h3>{match.name}, {match.age}</h3><p><Icon name="pin" size={15} />{match.city}</p></div><Ring value={match.score} /></div>
        <Tags items={match.tags} />
        <p className="bio">{match.bio}</p>
        <div className="card-actions"><button className="bookmark" aria-label={`Bookmark ${match.name}`}><Icon name="bookmark" /></button><button className="secondary-button">View Profile <Arrow /></button></div>
      </div>
    </article>
  );
}

function Header({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return (
    <header className="site-header" id="top">
      <a
        className="logo"
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onNavigate("/");
        }}
        aria-label="Saanjh home"
      >
        <span className="logo-mark"><i /><i /><i /></span>
        <span>Saanjh</span>
      </a>
      <nav className={open ? "open" : ""}>
        {["Home", "Matches", "Questions", "Messages", "Insights"].map((item) => (
          <a
            className={item === "Home" ? "active" : ""}
            href={`#${item.toLowerCase()}`}
            key={item}
            onClick={() => setOpen(false)}
          >
            {item}
          </a>
        ))}
      </nav>
      <div className="user-nav">
        <button aria-label="Search"><Icon name="search" /></button>
        <button className="notification" aria-label="Notifications"><Icon name="bell" /><i /></button>
        {user ? (
          <button
            type="button"
            className="user-logged-in-pill"
            onClick={() => onNavigate("/profile")}
            aria-label="View your profile"
          >
            <span className="user-pill-avatar">
              {user.profilePhoto ? (
                <img src={user.profilePhoto} alt={user.fullName} />
              ) : (
                <span>{user.fullName.charAt(0).toUpperCase()}</span>
              )}
            </span>
            <span className="user-pill-name">{user.displayName || user.fullName}</span>
          </button>
        ) : (
          <button
            type="button"
            className="login-button"
            onClick={() => onNavigate("/login")}
          >
            <Icon name="user" size={16} />
            <span>Login</span>
          </button>
        )}
      </div>
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu"><Icon name="menu" /></button>
    </header>
  );
}

function Hero() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">More Than a Match</p>
          <h1><span>Meet people who</span><br /><span>truly align with you</span></h1>
          <p className="lead">Thoughtful questions. Deeper compatibility.<br />A calmer way to meet the right people.</p>
          <div className="hero-actions"><PrimaryButton>View Today’s Matches</PrimaryButton><a href="#questions">Continue Your Questions</a></div>
        </div>
        <div className="hero-art">
          <img src={photos.hero} alt="Better Conversations, Brighter Connections — Values, Interests, Lifestyle, Personality, and More" />
        </div>
      </section>
      <section className="matches-section" id="matches">
        <div className="matches-heading"><h2>Today’s Matches</h2><p>Curated for you based on your answers and preferences.</p><a href="#matches">See All Matches <Arrow /></a></div>
        <div className="match-grid">{matches.map((match) => <MatchCard match={match} key={match.name} />)}</div>
      </section>
    </>
  );
}

function Compatibility() {
  return (
    <section className="compatibility">
      <div className="compat-copy"><h2>How<br />Compatibility<br />Works</h2><p>Our matching is based on your answers, preferences and what truly matters to you. It looks beyond surface-level details to find people who align with your values, lifestyle and personality.</p></div>
      <div className="big-ring-wrap"><Ring value={92} label="Overall Compatibility" /><div className="botanical ring-leaves"><span /><span /><span /></div></div>
      <div className="compat-stats"><Metrics /><div className="quote-box"><b>“</b><span>You’re likely to connect with people who value kindness, curiosity and meaningful growth.</span></div></div>
    </section>
  );
}

const answers = ["Exploring a new city or place", "Quiet time at home", "Outdoor adventures", "Catching up with friends"];

function Questions() {
  const [selected, setSelected] = useState("Outdoor adventures");
  return (
    <section className="questions-section" id="questions">
      <div className="question-copy"><p className="eyebrow">Get to Know What Matters</p><h2>Meaningful<br />Questions</h2><p>Our thoughtfully designed questions help us understand your values, interests and perspective on life, so we can suggest truly compatible matches.</p><PrimaryButton>Continue Questions</PrimaryButton></div>
      <div className="quiz-card">
        <div className="quiz-top"><span>Question 18 of 24</span><div className="quiz-progress"><i /></div><b>75%</b></div>
        <h3>How do you prefer to spend a free weekend?</h3>
        <div className="options">{answers.map((answer) => <label className={selected === answer ? "selected" : ""} key={answer}><input type="radio" name="weekend" value={answer} checked={selected === answer} onChange={() => setSelected(answer)} /><span>{answer}</span></label>)}</div>
      </div>
      <div className="notebook">
        <img src={photos.notebook} alt="Notebook on a desk with plants" />
      </div>
    </section>
  );
}

const prompts = [
  ["coffee", "What does a perfect weekend look like for you?"],
  ["leaf", "What’s something you’re currently excited about in life?"],
  ["people", "How do you like to spend time with close friends?"],
];

function Guided() {
  return (
    <section className="guided">
      <div className="botanical guided-left"><span /><span /><span /></div>
      <div className="guided-copy"><p className="eyebrow">From Match to Meaningful Talks</p><h2>Guided<br />Conversations</h2><p>Start with thoughtful prompts designed to help you break the ice and have deeper, more meaningful conversations.</p><PrimaryButton>Start a Conversation</PrimaryButton></div>
      <div className="prompt-grid">{prompts.map(([icon, text], index) => <article className="prompt-card" key={text}><div className={index === 1 ? "prompt-icon sage" : "prompt-icon"}><Icon name={icon} size={34} /></div><h3>{text}</h3></article>)}</div>
      <div className="botanical guided-right"><span /><span /><span /></div>
    </section>
  );
}

const gallery = [photos.aarohiProfile, photos.rohan, photos.meera];

function Profile() {
  const [current, setCurrent] = useState(0);
  const move = (direction: number) => setCurrent((current + direction + gallery.length) % gallery.length);
  return (
    <section className="profile-card">
      <div className="profile-photo">
        <img src={gallery[current]} alt="Aarohi profile" />
        <button className="gallery-prev" onClick={() => move(-1)} aria-label="Previous photo">←</button>
        <button className="gallery-next" onClick={() => move(1)} aria-label="Next photo">→</button>
        <div className="thumbnails">{gallery.map((photo, index) => <button onClick={() => setCurrent(index)} className={current === index ? "active" : ""} key={photo}><img src={index === 0 ? photos.aarohi : photo} alt="" /></button>)}</div>
      </div>
      <div className="profile-info">
        <h2>Aarohi, 24</h2>
        <p><Icon name="pin" size={18} /> Bangalore, India</p>
        <p><Icon name="briefcase" size={19} /> Product Designer at a Tech Company</p>
        <p><Icon name="school" size={20} /> NIT Trichy</p>
        <Tags items={["Travel", "Books", "Good Food", "Photography"]} />
        <p className="profile-bio">Loves exploring new places, meaningful conversations and weekend getaways. Always up for a good book and great coffee!</p>
      </div>
      <div className="profile-match">
        <div className="score-metrics"><Ring value={92} label="Compatibility" /><Metrics /></div>
        <h3>Shared Interests</h3>
        <Tags items={["Travel", "Books", "Nature", "Coffee", "Photography", "Hiking"]} />
        <div className="card-actions"><button className="secondary-button">Send a Message <Arrow /></button><button className="bookmark" aria-label="Bookmark Aarohi"><Icon name="bookmark" /></button></div>
      </div>
    </section>
  );
}

const journey = [
  ["Create Profile", "Tell us about yourself"],
  ["Answer Questions", "Share your values"],
  ["Set Preferences", "Choose what matters"],
  ["Get Daily Matches", "Curated for you"],
  ["Start Conversations", "Build real connections"],
];

function Journey() {
  return (
    <section className="journey">
      <div><h2>Your Journey to<br />Meaningful Connections</h2><p>A simple and thoughtful process to help you meet people who truly align with you.</p></div>
      <ol>{journey.map(([title, text], index) => <li key={title}><div className="step-number">{index + 1}</div><small>{index + 1}</small><strong>{title}</strong><span>{text}</span></li>)}</ol>
    </section>
  );
}

const stories = [
  { quote: "I found someone who truly understands me. The questions made all the difference.", name: "Riya, 25", city: "Bangalore", photo: photos.riya },
  { quote: "The conversations feel natural and meaningful. It’s a refreshing experience.", name: "Aditya, 28", city: "Delhi", photo: photos.aditya },
  { quote: "It’s not just about matching, it’s about finding people who share your values.", name: "Neha, 26", city: "Pune", photo: photos.neha },
];

function Stories() {
  const [offset, setOffset] = useState(0);
  const visible = stories.map((_, index) => stories[(index + offset) % stories.length]);
  const move = (direction: number) => setOffset((offset + direction + stories.length) % stories.length);
  return (
    <section className="stories">
      <div className="stories-copy">
        <p className="eyebrow">Real Stories</p>
        <h2>Meaningful<br />Connections<br />Happen Here</h2>
        <p>Hear from people who found more than just a match.</p>
        <div>
          <button onClick={() => move(-1)} aria-label="Previous stories">←</button>
          <button onClick={() => move(1)} aria-label="Next stories">→</button>
        </div>
      </div>
      <div className="story-grid">{visible.map((story, index) => <article className="story-card" key={`${story.name}-${index}`}><div className="story-quote"><b>“</b><p>{story.quote}</p></div><div className="story-person"><img src={story.photo} alt="" /><p><strong>{story.name}</strong><span>{story.city}</span></p></div></article>)}</div>
    </section>
  );
}

function CTA({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user } = useAuth();
  return (
    <section className="cta exact-cta">
      <div>
        <h2>Ready to meet people<br />who truly align with you?</h2>
        <p>Answer thoughtful questions, get curated matches<br />and start meaningful conversations today.</p>
        <div onClick={() => onNavigate(user ? "/profile" : "/signup")} style={{ display: "inline-block", cursor: "pointer" }}>
          <PrimaryButton>{user ? "Manage Your Profile" : "Create Your Account"}</PrimaryButton>
        </div>
      </div>
      <div className="hand-note cta-note">Same<br />Vibes<br />Deeper<br />Connections<i /></div>
    </section>
  );
}

function Footer({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <footer>
      <div className="footer-grid">
        <a
          className="logo"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("/");
          }}
          aria-label="Saanjh home"
        >
          <span className="logo-mark"><i /><i /><i /></span>
          <span>Saanjh</span>
        </a>
        <div><h3>Product</h3>{["Home", "Matches", "Questions", "Insights"].map((x) => <a href={`#${x.toLowerCase()}`} key={x}>{x}</a>)}</div>
        <div><h3>Support</h3>{["Help Center", "Safety", "Community Guidelines", "Contact Us"].map((x) => <a href="#top" key={x}>{x}</a>)}</div>
        <div>
          <h3>Account</h3>
          <a href="/login" onClick={(e) => { e.preventDefault(); onNavigate("/login"); }}>Sign In</a>
          <a href="/signup" onClick={(e) => { e.preventDefault(); onNavigate("/signup"); }}>Create Account</a>
          <a href="/profile" onClick={(e) => { e.preventDefault(); onNavigate("/profile"); }}>My Profile</a>
        </div>
        <div className="newsletter"><h3>Stay in the loop</h3><form onSubmit={(event) => event.preventDefault()}><input aria-label="Email address" placeholder="Enter your email" type="email" /><button aria-label="Subscribe">→</button></form><div className="socials"><a href="#top" aria-label="Instagram"><Icon name="instagram" /></a><a href="#top" aria-label="X"><Icon name="x" /></a><a href="#top" aria-label="LinkedIn"><Icon name="linkedin" /></a><a href="#top" aria-label="YouTube"><Icon name="youtube" /></a></div></div>
      </div>
      <div className="footer-bottom"><span>© 2026 Saanjh. All rights reserved.</span><span>Building a kinder, more connected world.</span></div>
    </footer>
  );
}

function ToastNotification() {
  const { toast, clearToast } = useAuth();
  if (!toast) return null;
  return (
    <div className="saanjh-toast-container">
      <div className={`saanjh-toast ${toast.type}`}>
        <span>{toast.type === "success" ? "✓" : toast.type === "error" ? "⚠" : "ℹ"}</span>
        <span>{toast.message}</span>
        <button className="saanjh-toast-close" onClick={clearToast} aria-label="Dismiss message">✕</button>
      </div>
    </div>
  );
}

function MainContent() {
  const { user, pendingEmail, isLoading } = useAuth();

  const [currentPath, setCurrentPath] = useState<string>(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path.startsWith("/login") || hash === "#login") return "/login";
    if (path.startsWith("/signup") || hash === "#signup") return "/signup";
    if (path.startsWith("/verify-email")) return "/verify-email";
    if (path.startsWith("/onboarding/google-complete")) return "/onboarding/google-complete";
    if (path.startsWith("/onboarding/profile")) return "/onboarding/profile";
    if (path.startsWith("/onboarding/interests")) return "/onboarding/interests";
    if (path.startsWith("/onboarding/interest-questions")) return "/onboarding/interest-questions";
    if (path.startsWith("/dashboard")) return "/dashboard";
    if (path.startsWith("/settings")) return "/settings";
    if (path === "/profile" || hash === "#profile") return "/profile";
    return "/";
  });

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path.toLowerCase());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const handleLocation = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.startsWith("/login") || hash === "#login") setCurrentPath("/login");
      else if (path.startsWith("/signup") || hash === "#signup") setCurrentPath("/signup");
      else if (path.startsWith("/verify-email")) setCurrentPath("/verify-email");
      else if (path.startsWith("/onboarding/google-complete")) setCurrentPath("/onboarding/google-complete");
      else if (path.startsWith("/onboarding/profile")) setCurrentPath("/onboarding/profile");
      else if (path.startsWith("/onboarding/interests")) setCurrentPath("/onboarding/interests");
      else if (path.startsWith("/onboarding/interest-questions")) setCurrentPath("/onboarding/interest-questions");
      else if (path.startsWith("/dashboard")) setCurrentPath("/dashboard");
      else if (path.startsWith("/settings")) setCurrentPath("/settings");
      else if (path === "/profile" || hash === "#profile") setCurrentPath("/profile");
      else setCurrentPath("/");
    };

    window.addEventListener("popstate", handleLocation);
    window.addEventListener("hashchange", handleLocation);
    return () => {
      window.removeEventListener("popstate", handleLocation);
      window.removeEventListener("hashchange", handleLocation);
    };
  }, []);

  // Route Guards based on auth status & onboarding step
  useEffect(() => {
    if (isLoading) return;

    // Unauthenticated user attempting to access protected onboarding or dashboard
    const isProtected =
      currentPath.startsWith("/onboarding/") ||
      currentPath === "/dashboard" ||
      currentPath === "/settings";

    if (!user && isProtected) {
      if (pendingEmail && currentPath === "/verify-email") {
        // Allowed to stay on verify
        return;
      }
      navigate("/login");
      return;
    }

    // Authenticated user step guards
    if (user) {
      if (!user.emailVerified && currentPath !== "/verify-email") {
        navigate("/verify-email");
        return;
      }

      if (user.onboardingStep === "google_complete" && currentPath !== "/onboarding/google-complete") {
        navigate("/onboarding/google-complete");
        return;
      }

      // If user is on login/signup but already authenticated
      if (currentPath === "/login" || currentPath === "/signup") {
        if (user.onboardingStep === "profile") navigate("/onboarding/profile");
        else if (user.onboardingStep === "interests") navigate("/onboarding/interests");
        else if (user.onboardingStep === "interest_questions") navigate("/onboarding/interest-questions");
        else navigate("/dashboard");
      }
    }
  }, [user, isLoading, currentPath, pendingEmail]);

  if (currentPath === "/login") {
    return <LoginPage onNavigate={navigate} />;
  }

  if (currentPath === "/signup") {
    return <SignupPage onNavigate={navigate} />;
  }

  if (currentPath === "/verify-email") {
    return <VerifyEmailPage onNavigate={navigate} />;
  }

  if (currentPath === "/onboarding/google-complete") {
    return <GoogleCompletePage onNavigate={navigate} />;
  }

  if (currentPath === "/onboarding/profile") {
    return <ProfileOnboardingPage onNavigate={navigate} />;
  }

  if (currentPath === "/onboarding/interests") {
    return <InterestsOnboardingPage onNavigate={navigate} />;
  }

  if (currentPath === "/onboarding/interest-questions") {
    return <InterestQuestionsPage onNavigate={navigate} />;
  }

  if (currentPath === "/dashboard") {
    return <DashboardPage onNavigate={navigate} />;
  }

  if (currentPath === "/settings") {
    return <SettingsPage onNavigate={navigate} />;
  }

  if (currentPath === "/profile") {
    return <ProfilePage onNavigate={navigate} />;
  }

  return (
    <>
      <Header onNavigate={navigate} />
      <main>
        <Hero />
        <Compatibility />
        <Questions />
        <Guided />
        <Profile />
        <Journey />
        <Stories />
        <CTA onNavigate={navigate} />
        <Footer onNavigate={navigate} />
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
      <ToastNotification />
    </AuthProvider>
  );
}
