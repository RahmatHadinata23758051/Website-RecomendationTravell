import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Info,
  Lightbulb,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchMySubmissions,
  PlaceSubmission,
  PlaceSubmissionPayload,
  SubmissionStatus,
  submitPlace,
} from '../services/placeSubmissionsApi';
import { SafeImage } from '../components/SafeImage';

const REGIONS = [
  'Kota Bandar Lampung',
  'Kota Metro',
  'Kabupaten Lampung Selatan',
  'Kabupaten Lampung Barat',
  'Kabupaten Lampung Tengah',
  'Kabupaten Lampung Timur',
  'Kabupaten Lampung Utara',
  'Kabupaten Mesuji',
  'Kabupaten Pesawaran',
  'Kabupaten Pesisir Barat',
  'Kabupaten Pringsewu',
  'Kabupaten Tanggamus',
  'Kabupaten Tulang Bawang',
  'Kabupaten Tulang Bawang Barat',
  'Kabupaten Way Kanan',
];

const CATEGORIES = [
  ['beach', 'Pantai'],
  ['waterfall', 'Air terjun'],
  ['nature', 'Alam'],
  ['culture', 'Budaya'],
  ['museum', 'Museum'],
  ['park', 'Taman'],
  ['culinary', 'Kuliner'],
  ['other', 'Lainnya'],
];

const EMPTY_FORM: PlaceSubmissionPayload = {
  name: '',
  category: '',
  address: '',
  cityRegency: '',
  district: '',
  village: '',
  latitude: -5.4,
  longitude: 105.2,
  description: '',
  phone: '',
  website: '',
  primaryPhotoUrl: '',
  facilities: [],
};

const STATUS_COPY: Record<SubmissionStatus, { label: string; tone: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Menunggu tinjauan', tone: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock3 className="h-4 w-4" /> },
  UNDER_REVIEW: { label: 'Sedang ditinjau', tone: 'bg-sky-50 text-sky-700 border-sky-200', icon: <Loader2 className="h-4 w-4" /> },
  APPROVED: { label: 'Disetujui', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-4 w-4" /> },
  REJECTED: { label: 'Tidak disetujui', tone: 'bg-rose-50 text-rose-700 border-rose-200', icon: <XCircle className="h-4 w-4" /> },
  NEEDS_MORE_INFO: { label: 'Butuh informasi', tone: 'bg-violet-50 text-violet-700 border-violet-200', icon: <Info className="h-4 w-4" /> },
  DUPLICATE: { label: 'Terindikasi duplikat', tone: 'bg-orange-50 text-orange-700 border-orange-200', icon: <ShieldAlert className="h-4 w-4" /> },
};

function getErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { message?: string | string[] } } })?.response;
  if (response?.status === 409) return 'Tempat ini terlihat sudah ada di katalog. Coba cari dengan nama yang berbeda atau cek kembali detailnya.';
  const message = response?.data?.message;
  return Array.isArray(message) ? message.join(' ') : message || 'Terjadi kendala. Periksa kembali data Anda dan coba lagi.';
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="flex items-baseline justify-between text-xs font-bold text-slate-800">
        {label}
        {hint && <span className="font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass = 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 placeholder:text-slate-400';

export const PlaceSubmitPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, openAuthModal } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dashboardOnly = searchParams.get('view') === 'submissions';
  const [form, setForm] = useState<PlaceSubmissionPayload>(EMPTY_FORM);
  const [step, setStep] = useState(1);
  const [submissions, setSubmissions] = useState<PlaceSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<PlaceSubmission | null>(null);

  const update = <K extends keyof PlaceSubmissionPayload>(key: K, value: PlaceSubmissionPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSubmitError(null);
  };

  const loadSubmissions = async () => {
    if (!isAuthenticated) return;
    setIsLoadingSubmissions(true);
    try {
      const page = await fetchMySubmissions({ limit: 50 });
      setSubmissions(page.data);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) void loadSubmissions();
  }, [isAuthenticated]);

  const validationError = useMemo(() => {
    if (step === 1 && (!form.name.trim() || !form.category)) return 'Isi nama tempat dan pilih kategorinya.';
    if (step === 2 && (!form.address.trim() || !form.cityRegency)) return 'Alamat dan kabupaten/kota wajib diisi.';
    if (step === 2 && (form.latitude < -6.2 || form.latitude > -3.5 || form.longitude < 103.5 || form.longitude > 106)) return 'Koordinat harus berada di wilayah Lampung.';
    return null;
  }, [form, step]);

  const nextStep = () => {
    setSubmitError(null);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setStep((current) => Math.min(3, current + 1));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.category || !form.address.trim() || !form.cityRegency) {
      setSubmitError('Lengkapi data wajib sebelum mengirim.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitPlace({ ...form, name: form.name.trim(), address: form.address.trim() });
      setSubmitted(result);
      setForm(EMPTY_FORM);
      setStep(1);
      setSubmissions((current) => [result, ...current]);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="flex min-h-[65vh] items-center justify-center pt-24"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-5 pb-16 pt-32">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5 sm:p-12">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-50 text-teal-600"><FilePlus2 className="h-8 w-8" /></div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Kontribusi untuk Lampung</p>
          <h1 className="font-display text-3xl font-extrabold text-slate-900">Bantu wisatawan menemukan tempat baru</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500">Masuk terlebih dahulu untuk mengajukan tempat dan melacak status tinjauan Anda.</p>
          <button onClick={() => openAuthModal('login')} className="mt-8 rounded-full bg-teal-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700">Masuk untuk melanjutkan</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f8fafc] px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <Link to="/explore" className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-teal-600"><ArrowLeft className="h-4 w-4" /> Kembali ke jelajah</Link>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600">PlaceSubmit</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Bagikan tempat favoritmu.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Cerita lokalmu membantu membuat katalog wisata Lampung lebih lengkap dan terpercaya.</p>
          </div>
          <button onClick={() => navigate('/submit-place?view=submissions')} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-700"><Clock3 className="h-4 w-4" /> Lihat pengajuan saya ({submissions.length})</button>
        </header>

        {dashboardOnly ? (
          <SubmissionDashboard submissions={submissions} isLoading={isLoadingSubmissions} onRefresh={loadSubmissions} onStart={() => navigate('/submit-place')} />
        ) : submitted ? (
          <SuccessState submission={submitted} onAnother={() => setSubmitted(null)} onDashboard={() => navigate('/submit-place?view=submissions')} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <form onSubmit={handleSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-8">
              <div className="mb-8 flex items-center gap-2">
                {[1, 2, 3].map((item) => <React.Fragment key={item}><div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${step >= item ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{step > item ? <Check className="h-4 w-4" /> : item}</div>{item < 3 && <div className={`h-px flex-1 ${step > item ? 'bg-teal-500' : 'bg-slate-200'}`} />}</React.Fragment>)}
              </div>
              {submitError && <div role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><span>{submitError}</span></div>}
              {step === 1 && <StepOne form={form} update={update} />}
              {step === 2 && <StepTwo form={form} update={update} />}
              {step === 3 && <StepThree form={form} update={update} />}
              <div className="mt-8 flex justify-between gap-3 border-t border-slate-100 pt-6"><button type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1} className="rounded-full px-5 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50 disabled:invisible">Sebelumnya</button>{step < 3 ? <button type="button" onClick={nextStep} className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700">Lanjut <ArrowRight className="h-4 w-4" /></button> : <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 disabled:cursor-wait disabled:opacity-70">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {isSubmitting ? 'Mengirim…' : 'Kirim pengajuan'}</button>}</div>
            </form>
            <aside className="hidden rounded-[2rem] border border-teal-100 bg-[#e9f8f5] p-6 lg:block"><Lightbulb aria-hidden="true" className="h-6 w-6 text-teal-600" /><h2 className="mt-5 font-display text-xl font-extrabold text-slate-900">Berbagi dengan bertanggung jawab</h2><ul className="mt-5 space-y-4 text-sm leading-5 text-slate-600"><li className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600" />Pastikan nama dan lokasi tempat sudah benar.</li><li className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600" />Gunakan foto atau tautan resmi jika tersedia.</li><li className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600" />Tim kami akan meninjau sebelum ditampilkan publik.</li></ul></aside>
          </div>
        )}
      </div>
    </main>
  );
};

function StepOne({ form, update }: { form: PlaceSubmissionPayload; update: <K extends keyof PlaceSubmissionPayload>(key: K, value: PlaceSubmissionPayload[K]) => void }) {
  return <section className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-600">Langkah 01</p><h2 className="mt-1 font-display text-2xl font-extrabold text-slate-900">Kenali tempatnya</h2><p className="mt-1 text-sm text-slate-500">Mulai dari informasi yang paling mudah dikenali wisatawan.</p></div><Field label="Nama tempat"><input className={inputClass} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Contoh: Pantai Gigi Hiu" maxLength={200} required /></Field><Field label="Kategori"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{CATEGORIES.map(([value, label]) => <button key={value} type="button" onClick={() => update('category', value)} className={`rounded-2xl border px-3 py-3 text-left text-xs font-bold transition ${form.category === value ? 'border-teal-500 bg-teal-50 text-teal-700 ring-2 ring-teal-500/10' : 'border-slate-200 text-slate-600 hover:border-teal-300'}`}>{label}</button>)}</div></Field><Field label="Deskripsi" hint="opsional"><textarea className={`${inputClass} min-h-32 resize-y`} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Apa yang membuat tempat ini istimewa?" maxLength={2000} /></Field></section>;
}

function StepTwo({ form, update }: { form: PlaceSubmissionPayload; update: <K extends keyof PlaceSubmissionPayload>(key: K, value: PlaceSubmissionPayload[K]) => void }) {
  return <section className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-600">Langkah 02</p><h2 className="mt-1 font-display text-2xl font-extrabold text-slate-900">Letaknya di mana?</h2><p className="mt-1 text-sm text-slate-500">Detail lokasi membantu kami menghindari data yang tumpang tindih.</p></div><Field label="Alamat"><textarea className={`${inputClass} min-h-24 resize-y`} value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="Jalan, pekon/desa, atau patokan" required /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Kabupaten / kota"><select className={inputClass} value={form.cityRegency} onChange={(event) => update('cityRegency', event.target.value)} required><option value="">Pilih wilayah</option>{REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}</select></Field><Field label="Kecamatan" hint="opsional"><input className={inputClass} value={form.district} onChange={(event) => update('district', event.target.value)} placeholder="Contoh: Kelumbayan" /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Latitude" hint="-6.2 sampai -3.5"><input type="number" step="any" className={inputClass} value={form.latitude} onChange={(event) => update('latitude', Number(event.target.value))} required /></Field><Field label="Longitude" hint="103.5 sampai 106"><input type="number" step="any" className={inputClass} value={form.longitude} onChange={(event) => update('longitude', Number(event.target.value))} required /></Field></div><div className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500"><MapPin className="h-5 w-5 shrink-0 text-teal-600" />Salin koordinat dari Google Maps agar lokasi tempat tampil tepat di peta.</div></section>;
}

function StepThree({ form, update }: { form: PlaceSubmissionPayload; update: <K extends keyof PlaceSubmissionPayload>(key: K, value: PlaceSubmissionPayload[K]) => void }) {
  return <section className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-600">Langkah 03</p><h2 className="mt-1 font-display text-2xl font-extrabold text-slate-900">Tambahkan detail</h2><p className="mt-1 text-sm text-slate-500">Semakin lengkap, semakin mudah wisatawan merencanakan kunjungan.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Nomor telepon" hint="opsional"><input className={inputClass} value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="0812…" /></Field><Field label="Website" hint="opsional"><input type="url" className={inputClass} value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="https://…" /></Field></div><Field label="Tautan foto utama" hint="opsional"><input type="url" className={inputClass} value={form.primaryPhotoUrl} onChange={(event) => update('primaryPhotoUrl', event.target.value)} placeholder="https://contoh.com/foto.jpg" /></Field><Field label="Fasilitas" hint="pisahkan dengan koma"><input className={inputClass} value={(form.facilities ?? []).join(', ')} onChange={(event) => update('facilities', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="Parkir, toilet, musala" /></Field><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800"><div className="flex gap-3"><Info className="h-5 w-5 shrink-0" /><p>Dengan mengirim pengajuan, Anda menyatakan informasi ini akurat dan bersedia tim KelanaLampung melakukan verifikasi.</p></div></div></section>;
}

function SuccessState({ submission, onAnother, onDashboard }: { submission: PlaceSubmission; onAnother: () => void; onDashboard: () => void }) {
  return <div className="mx-auto max-w-2xl rounded-[2rem] border border-emerald-200 bg-white p-8 text-center shadow-xl shadow-emerald-900/5 sm:p-12"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-10 w-10" /></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Pengajuan terkirim</p><h2 className="mt-2 font-display text-3xl font-extrabold text-slate-900">Terima kasih untuk kontribusinya!</h2><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-500"><strong className="text-slate-700">{submission.name}</strong> sedang menunggu tinjauan tim kami. Anda dapat memantau perkembangannya kapan saja.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={onDashboard} className="rounded-full bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-700">Lihat status pengajuan</button><button onClick={onAnother} className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition hover:border-teal-300 hover:text-teal-700"><RotateCcw className="h-4 w-4" /> Ajukan tempat lain</button></div></div>;
}

function SubmissionDashboard({ submissions, isLoading, onRefresh, onStart }: { submissions: PlaceSubmission[]; isLoading: boolean; onRefresh: () => void; onStart: () => void }) {
  return <section><div className="mb-5 flex items-center justify-between"><div><h2 className="font-display text-2xl font-extrabold text-slate-900">Pengajuan saya</h2><p className="mt-1 text-sm text-slate-500">Pantau setiap tempat yang pernah Anda bagikan.</p></div><button onClick={onRefresh} disabled={isLoading} aria-label="Segarkan pengajuan" className="rounded-full border border-slate-200 bg-white p-3 text-slate-500 transition hover:text-teal-600 disabled:opacity-50">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}</button></div>{isLoading ? <div className="grid gap-4 sm:grid-cols-2"><div className="h-44 animate-pulse rounded-3xl bg-slate-200" /><div className="h-44 animate-pulse rounded-3xl bg-slate-200" /></div> : submissions.length === 0 ? <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600"><FilePlus2 className="h-7 w-7" /></div><h3 className="mt-5 font-display text-xl font-extrabold text-slate-900">Belum ada pengajuan</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Punya tempat lokal yang belum kami kenal? Jadilah orang pertama yang membagikannya.</p><button onClick={onStart} className="mt-6 rounded-full bg-teal-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-teal-700">Mulai pengajuan</button></div> : <div className="grid gap-4 sm:grid-cols-2">{submissions.map((submission) => <SubmissionCard key={submission.id} submission={submission} />)}</div>}</section>;
}

function SubmissionCard({ submission }: { submission: PlaceSubmission }) {
  const status = STATUS_COPY[submission.status];
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex gap-4 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-teal-50 text-teal-600">
          {submission.primaryPhotoUrl ? (
            <SafeImage
              src={submission.primaryPhotoUrl}
              alt={`Foto tempat ${submission.name}`}
              className="h-full w-full object-cover"
              fallbackSrc="/assets/images/heroes/hero-pahawang-bg.png"
            />
          ) : (
            <MapPin className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-extrabold text-slate-900">{submission.name}</h3>
          <p className="mt-1 truncate text-xs text-slate-500">{submission.cityRegency} · {submission.category}</p>
        </div>
      </div>
      <div className="border-t border-slate-100 px-5 py-4">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${status.tone}`}>
          {status.icon}
          {status.label}
        </span>
        {(submission.rejectionReason || submission.moderationNotes || submission.duplicateNotes) && (
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            {submission.rejectionReason || submission.moderationNotes || submission.duplicateNotes}
          </p>
        )}
        <p className="mt-3 text-[11px] text-slate-400">
          Dikirim {new Date(submission.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </article>
  );
}
