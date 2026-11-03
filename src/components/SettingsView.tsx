import { useEffect, useState } from 'react';
import {
  Palette,
  HardDrive,
  Database,
  MonitorPlay,
  CloudOff,
  Info,
  Check,
  ChevronLeft,
  Bot,
} from 'lucide-react';
import MetadataSourcesPanel from '@/components/MetadataSourcesPanel';
import PlayerSettingsPanel from '@/components/PlayerSettingsPanel';
import AISettingsPanel from '@/components/AISettingsPanel';

interface SettingsViewProps {
  onBack: () => void;
  onNavigateLibrary: () => void;
}

const sections = [
  {
    id: 'appearance',
    label: 'ظاهر برنامه',
    icon: Palette,
    implemented: true,
    description: 'پوسته برنامه و حالت نمایش',
  },
  {
    id: 'library',
    label: 'کتابخانه رسانه',
    icon: HardDrive,
    implemented: true,
    description: 'مسیر پوشه فیلم‌ها و اسکن کتابخانه',
  },
  {
    id: 'sources',
    label: 'منابع اطلاعات فیلم',
    icon: Database,
    implemented: true,
    description: 'مدیریت ارائه‌دهندگان داده و اولویت آن‌ها',
  },
  {
    id: 'player',
    label: 'پخش‌کننده',
    icon: MonitorPlay,
    implemented: true,
    description: 'انتخاب پخش‌کننده ویدئو نصب‌شده روی ویندوز',
  },
  {
    id: 'ai',
    label: 'هوش مصنوعی',
    icon: Bot,
    implemented: true,
    description: 'پیکربندی ارائه‌دهندگان هوش مصنوعی و مدل آفلاین',
  },
  {
    id: 'offline',
    label: 'ذخیره‌سازی آفلاین',
    icon: CloudOff,
    implemented: true,
    description: 'دانلود و نگهداری داده برای استفاده بدون اتصال',
  },
  {
    id: 'about',
    label: 'درباره فیلم باز',
    icon: Info,
    implemented: true,
    description: 'نسخه و اطلاعات پروژه',
  },
] as const;

type SectionId = (typeof sections)[number]['id'];

interface FontSettings { homeHeading: number; quickView: number; details: number; }
const DEFAULT_FONT_SETTINGS: FontSettings = { homeHeading: 26, quickView: 16, details: 16 };
const FONT_SETTINGS_KEY = 'film-baz:font-settings';
function readFontSettings(): FontSettings {
  try {
    const saved = localStorage.getItem(FONT_SETTINGS_KEY);
    return saved ? { ...DEFAULT_FONT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_FONT_SETTINGS;
  } catch { return DEFAULT_FONT_SETTINGS; }
}

export default function SettingsView({ onBack, onNavigateLibrary }: SettingsViewProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('appearance');
  const [fontSettings, setFontSettings] = useState<FontSettings>(readFontSettings);
  const updateFontSetting = (key: keyof FontSettings, value: number) => setFontSettings((current) => ({ ...current, [key]: value }));
  const [theme, setTheme] = useState<'dark' | 'gold'>(() => {
    const saved = localStorage.getItem('film-baz:theme');
    return saved === 'gold' ? 'gold' : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('film-baz:theme', theme);
  }, [theme]);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 lg:px-8 fade-in">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-gold-bright"
      >
        <ChevronLeft size={18} className="rotate-180" />
        بازگشت به خانه
      </button>

      <h1 className="mb-6 text-2xl font-extrabold text-white">تنظیمات</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Section list */}
        <nav className="flex-shrink-0 lg:w-64" aria-label="بخش‌های تنظیمات">
          <ul className="flex gap-2 overflow-x-auto pb-2 scrollbar-hidden lg:flex-col lg:overflow-visible">
            {sections.map((s) => {
              const Icon = s.icon;
              const active = activeSection === s.id;
              return (
                <li key={s.id} className="flex-shrink-0">
                  <button
                    onClick={() => setActiveSection(s.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-right text-sm font-medium transition-colors ${
                      active
                        ? 'bg-white/10 text-gold-bright'
                        : 'text-text-secondary hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span className="whitespace-nowrap lg:whitespace-normal">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1">
          <div className="rounded-xl border border-white/10 bg-surface-2 p-5 sm:p-6">
            {activeSection === 'appearance' && (
              <SettingsPanel title="ظاهر برنامه" desc="پوسته و حالت نمایش برنامه">
                <div>
                  <p className="mb-3 text-sm font-medium text-text-secondary">پوسته رنگی</p>
                  <div className="flex flex-wrap gap-3">
                    <ThemeOption
                      label="تاریک سینمایی"
                      active={theme === 'dark'}
                      onClick={() => setTheme('dark')}
                      swatch="linear-gradient(135deg, #070a12, #1a2338)"
                    />
                    <ThemeOption
                      label="طلایی گرم"
                      active={theme === 'gold'}
                      onClick={() => setTheme('gold')}
                      swatch="linear-gradient(135deg, #0d1320, #d4af37)"
                    />
                  </div>
                </div>
                <div className="mt-5 border-t border-white/5 pt-4">
                  <h3 className="mb-4 text-sm font-semibold text-white">تنظیم اندازه فونت</h3>
                  <div className="space-y-5">
                    <FontSizeControl label="عنوان‌های صفحه نخست" value={fontSettings.homeHeading} min={18} max={36} onChange={(value) => updateFontSetting('homeHeading', value)} />
                    <FontSizeControl label="متن پنجره اطلاعات فیلم" value={fontSettings.quickView} min={12} max={22} onChange={(value) => updateFontSetting('quickView', value)} />
                    <FontSizeControl label="متن صفحه جزئیات فیلم" value={fontSettings.details} min={12} max={22} onChange={(value) => updateFontSetting('details', value)} />
                  </div>
                  <button type="button" onClick={() => setFontSettings(DEFAULT_FONT_SETTINGS)} className="btn-ghost mt-5 text-sm">بازنشانی اندازه فونت</button>
                  <p className="mt-3 text-xs text-text-muted">هر بخش جداگانه تنظیم می‌شود و انتخاب‌ها پس از بستن برنامه هم باقی می‌مانند.</p>
                </div>
              </SettingsPanel>
            )}

            {activeSection === 'library' && (
              <SettingsPanel title="کتابخانه رسانه" desc="مدیریت پوشه‌ها، اسکن و سازماندهی فایل‌ها">
                <p className="text-sm leading-relaxed text-text-secondary">
                  کتابخانه رسانه اکنون فعال است. می‌توانید پوشه‌های فیلم اضافه کنید، کتابخانه را اسکن کنید،
                  فایل‌های نیازمند بررسی را ببینید و با پیش‌نمایش و تأیید، فایل‌ها را سازماندهی کنید.
                </p>
                <button
                  onClick={onNavigateLibrary}
                  className="btn-primary mt-4 text-sm"
                >
                  ورود به کتابخانه رسانه
                </button>
                <div className="mt-5 border-t border-white/5 pt-4">
                  <p className="text-xs leading-relaxed text-text-muted">
                    اسکن فایل‌سیستم واقعی ویندوز پس از اضافه شدن اتصال Electron فعال خواهد شد.
                    در محیط فعلی، یک سیستم فایل فرضی برای آزمایش استفاده می‌شود.
                  </p>
                </div>
              </SettingsPanel>
            )}
            {activeSection === 'sources' && (
              <MetadataSourcesPanel />
            )}
            {activeSection === 'ai' && (
              <AISettingsPanel />
            )}
            {activeSection === 'player' && <PlayerSettingsPanel />}
            {activeSection === 'offline' && (
              <SettingsPanel title="ذخیره‌سازی آفلاین" desc="دانلود و نگهداری داده و تصاویر برای استفاده بدون اتصال">
                <p className="text-sm leading-relaxed text-text-secondary">
                  اطلاعات متادیتا (عنوان، سال، خلاصه، بازیگران) و تصاویر (پوستر، پس‌زمینه، عکس بازیگران)
                  برای هر فیلم در پوشه کنار آن ذخیره می‌شوند. این داده‌ها حتی بدون اتصال اینترنت قابل مشاهده هستند.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-text-muted">
                  برای صادرات اطلاعات یک فیلم، به بخش کتابخانه مراجعه کنید، فیلم مورد نظر را انتخاب و
                  دکمه «جستجوی اطلاعات» را بزنید. پس از دریافت اطلاعات، دکمه صادرات در صفحه بررسی اطلاعات در دسترس است.
                </p>
                <button
                  onClick={onNavigateLibrary}
                  className="btn-primary mt-4 text-sm"
                >
                  ورود به کتابخانه رسانه
                </button>
              </SettingsPanel>
            )}
            {activeSection === 'about' && (
              <SettingsPanel title="درباره فیلم باز" desc="اطلاعات نسخه و پروژه">
                <dl className="space-y-3 text-sm">
                  <InfoRow label="نام برنامه" value="فیلم باز (FILM BAZ)" />
                  <InfoRow label="شعار" value="آرشیو فیلم و سریال شما" />
                  <InfoRow label="نسخه" value="۰.۱.۰ (فاز رابط کاربری)" />
                  <InfoRow label="بستر" value="React + TypeScript + Vite" />
                </dl>
                <p className="mt-5 border-t border-white/5 pt-4 text-sm leading-relaxed text-text-secondary">
                  این نسخه پایه رابط کاربری و طراحی است. قابلیت‌هایی مانند اسکن فایل‌سیستم، پخش ویدئو،
                  تشخیص پخش‌کننده و بسته‌بندی به‌صورت EXE در فازهای بعدی اضافه خواهد شد.
                </p>
              </SettingsPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="mt-1 text-sm text-text-muted">{desc}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function FontSizeControl({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-3 text-sm text-text-secondary">
        <span>{label}</span><span className="font-semibold tabular-nums text-gold-bright">{value}</span>
      </span>
      <input type="range" min={min} max={max} step={1} value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full cursor-pointer accent-amber-400" />
    </label>
  );
}

function ThemeOption({
  label,
  active,
  onClick,
  swatch,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  swatch: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
        active ? 'border-gold bg-gold/5' : 'border-white/10 hover:border-white/20'
      }`}
      aria-pressed={active}
    >
      <div
        className="h-14 w-14 rounded-lg"
        style={{ background: swatch }}
        aria-hidden="true"
      />
      <div className="flex items-center gap-1.5">
        {active && <Check size={14} className="text-gold-bright" />}
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="font-medium text-white">{value}</dd>
    </div>
  );
}
