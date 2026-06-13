import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Blocks,
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Code2,
  Database,
  Eye,
  FileSearch,
  Fingerprint,
  Gauge,
  Globe2,
  KeyRound,
  Laptop,
  LockKeyhole,
  MailWarning,
  Network,
  ScanSearch,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  X
} from 'lucide-react';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { useLanguage } from '../contexts/LanguageContext';
import './Landing.css';

const protectionItems = [
  { icon: KeyRound, english: 'API keys & tokens', vietnamese: 'API key và token' },
  { icon: Database, english: 'Database credentials', vietnamese: 'Thông tin kết nối CSDL' },
  { icon: Code2, english: 'Source code', vietnamese: 'Mã nguồn' },
  { icon: Users, english: 'Customer & HR data', vietnamese: 'Dữ liệu khách hàng và nhân sự' },
  { icon: FileSearch, english: 'Documents & files', vietnamese: 'Tài liệu và tệp tin' },
  { icon: MailWarning, english: 'External destinations', vietnamese: 'Kênh gửi ra bên ngoài' },
];

export const Landing: React.FC = () => {
  const { t } = useLanguage();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll(
      '.reveal-up, .reveal-left, .reveal-right, .reveal-scale'
    );
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      <div className="landing-glow landing-glow-one" />
      <div className="landing-glow landing-glow-two" />

      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label="AIGuard home">
          <span className="landing-brand-icon"><Shield size={22} /></span>
          <span>
            <strong>AIGuard</strong>
            <small>CONTROL TOWER</small>
          </span>
        </Link>

        <nav className="landing-nav">
          <button type="button" onClick={() => scrollTo('platform')}>
            {t('Platform', 'Nền tảng')}
          </button>
          <button type="button" onClick={() => scrollTo('how-it-works')}>
            {t('How it works', 'Cách hoạt động')}
          </button>
          <button type="button" onClick={() => scrollTo('capabilities')}>
            {t('Capabilities', 'Năng lực')}
          </button>
          <button type="button" onClick={() => scrollTo('architecture')}>
            {t('Architecture', 'Kiến trúc')}
          </button>
        </nav>

        <div className="landing-header-actions">
          <LanguageSwitcher compact />
          <Link to="/login" className="landing-login-link">
            {t('Sign in', 'Đăng nhập')}
          </Link>
          <Link to="/login" className="landing-button landing-button-small">
            {t('Open Control Tower', 'Mở Control Tower')}
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow">
              <span className="landing-live-dot" />
              {t('Enterprise AI Security Platform', 'Nền tảng an toàn AI cho doanh nghiệp')}
            </div>

            <h1>
              {t('Stop sensitive data', 'Ngăn dữ liệu nhạy cảm')}
              <span>{t('before AI sends it out.', 'trước khi AI gửi ra ngoài.')}</span>
            </h1>

            <p className="landing-hero-description">
              {t(
                'AIGuard controls how employees use generative AI and how autonomous AI Agents access data, call tools, and perform actions across enterprise systems.',
                'AIGuard kiểm soát cách nhân viên sử dụng AI tạo sinh và cách AI Agent tự động truy cập dữ liệu, gọi công cụ, thực hiện hành động trong hệ thống doanh nghiệp.'
              )}
            </p>

            <div className="landing-hero-actions">
              <Link to="/login" className="landing-button">
                <ShieldCheck size={18} />
                {t('Explore the Control Tower', 'Trải nghiệm Control Tower')}
                <ArrowRight size={17} />
              </Link>
              <button type="button" className="landing-button-secondary" onClick={() => scrollTo('how-it-works')}>
                <Workflow size={18} />
                {t('See how it protects', 'Xem cách hệ thống bảo vệ')}
              </button>
            </div>

            <div className="landing-trust-row">
              <span><CheckCircle2 size={16} /> {t('Deploy on employee devices', 'Cài trên máy nhân viên')}</span>
              <span><CheckCircle2 size={16} /> {t('Policy by department', 'Chính sách theo phòng ban')}</span>
              <span><CheckCircle2 size={16} /> {t('Tamper-evident audit', 'Audit chống chỉnh sửa')}</span>
            </div>
          </div>

          <div className="landing-hero-visual" aria-label={t('AIGuard risk analysis preview', 'Mô phỏng phân tích rủi ro AIGuard')}>
            <div className="landing-orbit landing-orbit-one" />
            <div className="landing-orbit landing-orbit-two" />
            <div className="hero-console">
              <div className="hero-console-bar">
                <div className="hero-window-dots"><i /><i /><i /></div>
                <span><ShieldCheck size={14} /> AIGuard Endpoint DLP</span>
                <span className="hero-console-status">{t('PROTECTED', 'ĐANG BẢO VỆ')}</span>
              </div>

              <div className="hero-console-body">
                <div className="hero-source-row">
                  <span className="hero-app-icon"><Sparkles size={17} /></span>
                  <div>
                    <small>{t('Destination', 'Nền tảng đích')}</small>
                    <strong>ChatGPT</strong>
                  </div>
                  <span className="hero-scan-pill"><ScanSearch size={13} /> {t('Scanning', 'Đang quét')}</span>
                </div>

                <div className="hero-prompt-box">
                  <span className="hero-prompt-label">{t('Content intercepted before sending', 'Nội dung được chặn trước khi gửi')}</span>
                  <p>
                    {t('Review this production config:', 'Kiểm tra cấu hình production này:')}
                    <br />
                    <mark>Server=db-prod-01; Password=••••••••</mark>
                    <br />
                    <mark>sk-proj-••••••••••••••••</mark>
                  </p>
                </div>

                <div className="hero-detection-list">
                  <div>
                    <span className="hero-detection-icon critical"><KeyRound size={15} /></span>
                    <p><strong>API_KEY</strong><small>{t('Critical secret detected', 'Phát hiện khóa bí mật nghiêm trọng')}</small></p>
                    <b>+70</b>
                  </div>
                  <div>
                    <span className="hero-detection-icon high"><Database size={15} /></span>
                    <p><strong>DB_CREDENTIAL</strong><small>{t('Production credential', 'Thông tin truy cập production')}</small></p>
                    <b>+75</b>
                  </div>
                </div>

                <div className="hero-decision-row">
                  <div>
                    <small>{t('Risk score', 'Điểm rủi ro')}</small>
                    <strong>96<span>/100</span></strong>
                  </div>
                  <div className="hero-risk-meter"><i /></div>
                  <div className="hero-blocked">
                    <X size={15} />
                    {t('SEND BLOCKED', 'ĐÃ CHẶN GỬI')}
                  </div>
                </div>
              </div>
            </div>

            <div className="hero-floating-card hero-floating-left">
              <Fingerprint size={19} />
              <span><small>{t('Data masked', 'Dữ liệu đã che')}</small><strong>[API_KEY]</strong></span>
            </div>
            <div className="hero-floating-card hero-floating-right">
              <Activity size={19} />
              <span><small>{t('Decision latency', 'Độ trễ quyết định')}</small><strong>&lt; 120 ms</strong></span>
            </div>
          </div>
        </section>

        <section className="landing-tech-strip" aria-label={t('Supported platforms', 'Nền tảng được hỗ trợ')}>
          <p>{t('CONTROL AI USAGE ACROSS', 'KIỂM SOÁT VIỆC SỬ DỤNG AI TRÊN')}</p>
          <div>
            <span><BrainCircuit size={18} /> ChatGPT</span>
            <span><Sparkles size={18} /> Gemini</span>
            <span><Bot size={18} /> Claude</span>
            <span><Code2 size={18} /> Copilot</span>
            <span><Globe2 size={18} /> {t('Other AI websites', 'Website AI khác')}</span>
            <span><Network size={18} /> {t('Enterprise Agents', 'Agent doanh nghiệp')}</span>
          </div>
        </section>

        <section className="landing-section landing-problem-section">
          <div className="landing-section-heading reveal-up">
            <span>{t('THE REAL RISK', 'RỦI RO THỰC TẾ')}</span>
            <h2>{t('One paste can become a data incident.', 'Một lần dán có thể trở thành sự cố dữ liệu.')}</h2>
            <p>
              {t(
                'Employees need AI to work faster. The business needs control over what leaves its boundary.',
                'Nhân viên cần AI để làm việc nhanh hơn. Doanh nghiệp cần kiểm soát dữ liệu nào được phép đi ra ngoài.'
              )}
            </p>
          </div>

          <div className="landing-problem-grid">
            <article className="landing-problem-card reveal-up delay-100">
              <span className="problem-number">01</span>
              <div className="problem-icon"><Code2 size={23} /></div>
              <h3>{t('Accidental disclosure', 'Vô tình làm lộ dữ liệu')}</h3>
              <p>{t('Source code, credentials, customer records, CVs, and financial reports are pasted into public AI tools.', 'Mã nguồn, thông tin truy cập, dữ liệu khách hàng, CV và báo cáo tài chính bị dán vào công cụ AI công cộng.')}</p>
            </article>
            <article className="landing-problem-card reveal-up delay-200">
              <span className="problem-number">02</span>
              <div className="problem-icon"><Bot size={23} /></div>
              <h3>{t('Autonomous agent actions', 'Hành động tự động của Agent')}</h3>
              <p>{t('AI Agents can read databases, call APIs, export files, and send email before a human sees the risk.', 'AI Agent có thể đọc cơ sở dữ liệu, gọi API, xuất tệp và gửi email trước khi con người nhận ra rủi ro.')}</p>
            </article>
            <article className="landing-problem-card reveal-up delay-300">
              <span className="problem-number">03</span>
              <div className="problem-icon"><CircleAlert size={23} /></div>
              <h3>{t('Invisible security gaps', 'Khoảng trống giám sát')}</h3>
              <p>{t('Private AI infrastructure protects hosting, but it does not automatically enforce internal data access and action policies.', 'Hạ tầng AI riêng bảo vệ nơi lưu trữ, nhưng không tự kiểm soát quyền truy cập dữ liệu và hành động nội bộ.')}</p>
            </article>
          </div>
        </section>

        <section id="platform" className="landing-section landing-platform-section">
          <div className="landing-section-heading align-left reveal-up">
            <span>{t('ONE PLATFORM, TWO CONTROL LAYERS', 'MỘT NỀN TẢNG, HAI TẦNG KIỂM SOÁT')}</span>
            <h2>{t('Protection from human prompt to autonomous action.', 'Bảo vệ từ prompt của nhân viên đến hành động tự động.')}</h2>
          </div>

          <div className="landing-layer-grid">
            <article className="landing-layer-card layer-endpoint reveal-left">
              <div className="layer-card-top">
                <span className="layer-number">LAYER 01</span>
                <span className="layer-icon"><Laptop size={27} /></span>
              </div>
              <h3>AI Usage Gateway</h3>
              <p>{t('Stops employees from sending sensitive company data to generative AI websites and applications.', 'Ngăn nhân viên gửi dữ liệu nhạy cảm của doanh nghiệp vào website và ứng dụng AI tạo sinh.')}</p>
              <ul>
                <li><Check size={15} /> {t('Browser extension intercepts paste and submit', 'Extension chặn thao tác dán và gửi')}</li>
                <li><Check size={15} /> {t('Desktop Agent monitors supported channels', 'Desktop Agent giám sát các kênh được hỗ trợ')}</li>
                <li><Check size={15} /> {t('Regex + contextual sensitive-data detection', 'Phát hiện dữ liệu nhạy cảm bằng Regex và ngữ cảnh')}</li>
                <li><Check size={15} /> {t('Allow, mask, approve, or block by risk', 'Cho phép, che, duyệt hoặc chặn theo rủi ro')}</li>
              </ul>
              <div className="layer-flow">
                <span>{t('Employee', 'Nhân viên')}</span><ChevronRight size={14} />
                <span>AIGuard</span><ChevronRight size={14} />
                <span>{t('Generative AI', 'AI tạo sinh')}</span>
              </div>
            </article>

            <article className="landing-layer-card layer-agent reveal-right">
              <div className="layer-card-top">
                <span className="layer-number">LAYER 02</span>
                <span className="layer-icon"><Bot size={27} /></span>
              </div>
              <h3>AI Agent Control Tower</h3>
              <p>{t('Governs what AI Agents can read, which tools they can call, and where they can send enterprise data.', 'Quản trị dữ liệu AI Agent được đọc, công cụ được gọi và nơi Agent được phép gửi dữ liệu doanh nghiệp.')}</p>
              <ul>
                <li><Check size={15} /> {t('Least-privilege tool permissions', 'Phân quyền công cụ theo đặc quyền tối thiểu')}</li>
                <li><Check size={15} /> {t('Tool-call interception before execution', 'Kiểm tra tool-call trước khi thực thi')}</li>
                <li><Check size={15} /> {t('Prompt injection and exfiltration detection', 'Phát hiện prompt injection và đánh cắp dữ liệu')}</li>
                <li><Check size={15} /> {t('Human approval for dangerous actions', 'Con người phê duyệt hành động nguy hiểm')}</li>
              </ul>
              <div className="layer-flow">
                <span>AI Agent</span><ChevronRight size={14} />
                <span>{t('Policy engine', 'Bộ chính sách')}</span><ChevronRight size={14} />
                <span>Tools & APIs</span>
              </div>
            </article>
          </div>
        </section>

        <section id="how-it-works" className="landing-section landing-workflow-section">
          <div className="landing-section-heading reveal-up">
            <span>{t('REAL-TIME ENFORCEMENT', 'KIỂM SOÁT THEO THỜI GIAN THỰC')}</span>
            <h2>{t('Inspect. Decide. Enforce. Audit.', 'Kiểm tra. Quyết định. Thực thi. Kiểm toán.')}</h2>
          </div>

          <div className="landing-workflow">
            {[
              { icon: Eye, number: '01', titleEn: 'Intercept', titleVi: 'Chặn trước', descEn: 'Capture prompts, uploads, and Agent tool-calls before data leaves.', descVi: 'Bắt prompt, tệp tải lên và tool-call trước khi dữ liệu rời hệ thống.' },
              { icon: ScanSearch, number: '02', titleEn: 'Detect', titleVi: 'Phát hiện', descEn: 'Find credentials, PII, source code, financial, HR, and customer data.', descVi: 'Tìm thông tin truy cập, PII, mã nguồn, dữ liệu tài chính, nhân sự và khách hàng.' },
              { icon: Gauge, number: '03', titleEn: 'Score', titleVi: 'Chấm điểm', descEn: 'Calculate risk using policy, department, content type, and destination.', descVi: 'Tính rủi ro theo chính sách, phòng ban, loại nội dung và nơi nhận.' },
              { icon: ShieldAlert, number: '04', titleEn: 'Enforce', titleVi: 'Thực thi', descEn: 'Allow, mask, request approval, or block the operation immediately.', descVi: 'Cho phép, che dữ liệu, yêu cầu phê duyệt hoặc chặn ngay lập tức.' },
              { icon: Blocks, number: '05', titleEn: 'Prove', titleVi: 'Chứng minh', descEn: 'Hash audit events and anchor batches to Blockchain for verification.', descVi: 'Băm sự kiện kiểm toán và neo lô lên Blockchain để xác minh.' },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <React.Fragment key={step.number}>
                  <article className={`landing-workflow-step reveal-scale delay-${(index + 1) * 100}`}>
                    <span className="workflow-step-number">{step.number}</span>
                    <span className="workflow-step-icon"><Icon size={23} /></span>
                    <h3>{t(step.titleEn, step.titleVi)}</h3>
                    <p>{t(step.descEn, step.descVi)}</p>
                  </article>
                  {index < 4 && <div className="workflow-connector"><ChevronRight size={18} /></div>}
                </React.Fragment>
              );
            })}
          </div>
        </section>

        <section id="capabilities" className="landing-section landing-capabilities-section">
          <div className="landing-capability-copy reveal-left">
            <span className="landing-section-label">{t('SENSITIVE DATA COVERAGE', 'PHẠM VI DỮ LIỆU NHẠY CẢM')}</span>
            <h2>{t('Know what is leaving your business.', 'Biết chính xác dữ liệu nào đang rời doanh nghiệp.')}</h2>
            <p>{t('AIGuard combines fast local detection with centralized policy and contextual analysis to reduce both latency and false positives.', 'AIGuard kết hợp phát hiện nhanh tại máy người dùng với chính sách tập trung và phân tích ngữ cảnh để giảm độ trễ lẫn chặn nhầm.')}</p>
            <div className="landing-protection-list">
              {protectionItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.english}>
                    <span><Icon size={17} /></span>
                    {t(item.english, item.vietnamese)}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="landing-risk-panel reveal-right delay-200">
            <div className="risk-panel-header">
              <div>
                <small>{t('POLICY DECISION ENGINE', 'BỘ MÁY QUYẾT ĐỊNH CHÍNH SÁCH')}</small>
                <strong>{t('Risk-based enforcement', 'Thực thi theo mức rủi ro')}</strong>
              </div>
              <BadgeCheck size={27} />
            </div>
            <div className="risk-level-row risk-low"><span>LOW</span><p>{t('Safe business content', 'Nội dung doanh nghiệp an toàn')}</p><b>{t('ALLOW', 'CHO PHÉP')}</b></div>
            <div className="risk-level-row risk-medium"><span>MEDIUM</span><p>{t('PII or limited sensitive data', 'PII hoặc dữ liệu nhạy cảm giới hạn')}</p><b>{t('MASK', 'CHE DỮ LIỆU')}</b></div>
            <div className="risk-level-row risk-high"><span>HIGH</span><p>{t('Source code or business records', 'Mã nguồn hoặc hồ sơ doanh nghiệp')}</p><b>{t('APPROVE', 'PHÊ DUYỆT')}</b></div>
            <div className="risk-level-row risk-critical"><span>CRITICAL</span><p>{t('Credentials or severe exfiltration', 'Thông tin truy cập hoặc đánh cắp nghiêm trọng')}</p><b>{t('BLOCK', 'CHẶN')}</b></div>
            <div className="risk-panel-footer">
              <LockKeyhole size={16} />
              {t('Thresholds are configurable for Dev, Sales, HR, Finance, and custom departments.', 'Ngưỡng có thể cấu hình riêng cho Dev, Sales, HR, Kế toán và các phòng ban tùy chỉnh.')}
            </div>
          </div>
        </section>

        <section id="architecture" className="landing-section landing-architecture-section">
          <div className="landing-section-heading reveal-up">
            <span>{t('BUILT FOR ENTERPRISE CONTROL', 'ĐƯỢC THIẾT KẾ CHO QUẢN TRỊ DOANH NGHIỆP')}</span>
            <h2>{t('Security that operates where the risk happens.', 'Bảo mật hoạt động ngay tại nơi rủi ro phát sinh.')}</h2>
          </div>

          <div className="architecture-diagram reveal-scale delay-200">
            <div className="architecture-column">
              <small>{t('EMPLOYEE DEVICES', 'THIẾT BỊ NHÂN VIÊN')}</small>
              <div><Globe2 size={19} /> Browser Extension</div>
              <div><Laptop size={19} /> Desktop Agent</div>
              <div><FileSearch size={19} /> File Scanner</div>
            </div>
            <div className="architecture-flow-line"><span /><ChevronRight size={20} /></div>
            <div className="architecture-core">
              <span className="architecture-core-icon"><Shield size={31} /></span>
              <small>AIGUARD</small>
              <strong>Policy & Risk Engine</strong>
              <p>Identity · DLP · Approval · Audit</p>
            </div>
            <div className="architecture-flow-line"><span /><ChevronRight size={20} /></div>
            <div className="architecture-column">
              <small>{t('CONTROLLED DESTINATIONS', 'ĐÍCH ĐƯỢC KIỂM SOÁT')}</small>
              <div><BrainCircuit size={19} /> Generative AI</div>
              <div><Bot size={19} /> AI Agents</div>
              <div><Network size={19} /> Tools & APIs</div>
            </div>
          </div>

          <div className="landing-enterprise-grid">
            <div className="reveal-up delay-100"><Fingerprint size={22} /><strong>{t('Identity-aware', 'Theo danh tính')}</strong><p>{t('JWT, tenant, role, and department boundaries.', 'Ranh giới theo JWT, tenant, vai trò và phòng ban.')}</p></div>
            <div className="reveal-up delay-200"><Gauge size={22} /><strong>{t('Low perceived latency', 'Độ trễ cảm nhận thấp')}</strong><p>{t('Local Regex, streaming, and asynchronous analysis.', 'Regex cục bộ, streaming và phân tích bất đồng bộ.')}</p></div>
            <div className="reveal-up delay-300"><Blocks size={22} /><strong>{t('Verifiable audit', 'Kiểm toán xác minh được')}</strong><p>{t('SQL detail logs with SHA-256 Blockchain anchoring.', 'Log chi tiết trên SQL với hash SHA-256 neo Blockchain.')}</p></div>
            <div className="reveal-up delay-400"><Workflow size={22} /><strong>{t('Human in the loop', 'Con người trong quy trình')}</strong><p>{t('Real-time approval for sensitive prompts and actions.', 'Phê duyệt thời gian thực cho prompt và hành động nhạy cảm.')}</p></div>
          </div>
        </section>

        <section className="landing-cta-section reveal-scale delay-200">
          <div className="landing-cta-grid" />
          <div className="landing-cta-icon"><ShieldCheck size={34} /></div>
          <h2>{t('Let employees use AI without losing control of data.', 'Cho nhân viên sử dụng AI mà không mất quyền kiểm soát dữ liệu.')}</h2>
          <p>{t('Open the AIGuard Control Tower to test policies, review events, and manage AI Agents.', 'Mở AIGuard Control Tower để thử chính sách, xem sự kiện và quản lý AI Agent.')}</p>
          <Link to="/login" className="landing-button landing-button-light">
            {t('Enter Control Tower', 'Truy cập Control Tower')}
            <ArrowRight size={17} />
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-brand">
          <span className="landing-brand-icon"><Shield size={20} /></span>
          <span><strong>AIGuard</strong><small>CONTROL TOWER</small></span>
        </div>
        <p>{t('Enterprise generative AI and AI Agent security governance.', 'Nền tảng quản trị an toàn AI tạo sinh và AI Agent cho doanh nghiệp.')}</p>
        <div>
          <span>Endpoint DLP</span>
          <span>Agent Governance</span>
          <span>Blockchain Audit</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
