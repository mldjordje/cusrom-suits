"use client";

import { useEffect, useState } from "react";

type SiteNavItem = { href: string; label: string; labelEn: string };
type SiteFooterGroup = { title: string; titleEn: string; links: SiteNavItem[] };
type SiteStoreLocation = {
  slug: string;
  city: string;
  cityEn: string;
  title: string;
  titleEn: string;
  address: string;
  addressEn: string;
  mapLabel: string;
  phone: string;
  landline?: string;
  email: string;
  hours: string[];
  hoursEn: string[];
  mapEmbedUrl: string;
};
type SiteContent = {
  navigation: { items: SiteNavItem[] };
  footer: {
    eyebrow: string;
    eyebrowEn: string;
    brandCopy: string;
    brandCopyEn: string;
    instagramUrl: string;
    facebookUrl: string;
    bottomTagline: string;
    bottomTaglineEn: string;
    groups: SiteFooterGroup[];
  };
  contactPage: {
    title: string;
    titleEn: string;
    intro: string;
    introEn: string;
    detailsTitle: string;
    detailsTitleEn: string;
    formTitle: string;
    formTitleEn: string;
    preferredStorePlaceholder: string;
    preferredStorePlaceholderEn: string;
    onlineOptionLabel: string;
    onlineOptionLabelEn: string;
    submitLabel: string;
    submitLabelEn: string;
  };
  storesPage: {
    title: string;
    titleEn: string;
    intro: string;
    introEn: string;
    callCtaLabel: string;
    callCtaLabelEn: string;
    contactCardTitle: string;
    contactCardTitleEn: string;
    hoursCardTitle: string;
    hoursCardTitleEn: string;
  };
  aboutPage: {
    heroImage: string;
    heroAlt: string;
    heroAltEn: string;
    heroTitle: string;
    heroTitleEn: string;
    heroSubtitle: string;
    heroSubtitleEn: string;
    introTitle: string;
    introTitleEn: string;
    paragraphs: string[];
    paragraphsEn: string[];
    primaryCtaLabel: string;
    primaryCtaLabelEn: string;
    primaryCtaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaLabelEn: string;
    secondaryCtaHref: string;
    secondaryImage: string;
    secondaryImageAlt: string;
    secondaryImageAltEn: string;
  };
  stores: SiteStoreLocation[];
  announcements: SiteAnnouncementsContent;
  testimonials: SiteTestimonialsContent;
};
type SiteAnnouncementsContent = {
  enabled: boolean;
  items: string[];
  itemsEn: string[];
};
type SiteTestimonial = {
  id: string;
  text: string;
  textEn: string;
  author: string;
  location: string;
  locationEn: string;
  productSku: string;
  rating: number;
};
type SiteTestimonialsContent = {
  enabled: boolean;
  title: string;
  titleEn: string;
  items: SiteTestimonial[];
};
type LandingDocument = { title: string; description: string; url: string };

const fieldClass = "rounded-xl border border-slate-200 px-3 py-2 text-sm";
const cardClass = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
const actionClass =
  "rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700";
const dangerClass =
  "rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700";

const emptyNav = (): SiteNavItem => ({ href: "", label: "", labelEn: "" });
const emptyGroup = (): SiteFooterGroup => ({ title: "", titleEn: "", links: [emptyNav()] });
const emptyStore = (): SiteStoreLocation => ({
  slug: "",
  city: "",
  cityEn: "",
  title: "",
  titleEn: "",
  address: "",
  addressEn: "",
  mapLabel: "",
  phone: "",
  landline: "",
  email: "",
  hours: [""],
  hoursEn: [""],
  mapEmbedUrl: "",
});
const emptyDocument = (): LandingDocument => ({ title: "", description: "", url: "" });

const defaultContent: SiteContent = {
  navigation: { items: [] },
  footer: {
    eyebrow: "",
    eyebrowEn: "",
    brandCopy: "",
    brandCopyEn: "",
    instagramUrl: "",
    facebookUrl: "",
    bottomTagline: "",
    bottomTaglineEn: "",
    groups: [],
  },
  contactPage: {
    title: "",
    titleEn: "",
    intro: "",
    introEn: "",
    detailsTitle: "",
    detailsTitleEn: "",
    formTitle: "",
    formTitleEn: "",
    preferredStorePlaceholder: "",
    preferredStorePlaceholderEn: "",
    onlineOptionLabel: "",
    onlineOptionLabelEn: "",
    submitLabel: "",
    submitLabelEn: "",
  },
  storesPage: {
    title: "",
    titleEn: "",
    intro: "",
    introEn: "",
    callCtaLabel: "",
    callCtaLabelEn: "",
    contactCardTitle: "",
    contactCardTitleEn: "",
    hoursCardTitle: "",
    hoursCardTitleEn: "",
  },
  aboutPage: {
    heroImage: "",
    heroAlt: "",
    heroAltEn: "",
    heroTitle: "",
    heroTitleEn: "",
    heroSubtitle: "",
    heroSubtitleEn: "",
    introTitle: "",
    introTitleEn: "",
    paragraphs: [],
    paragraphsEn: [],
    primaryCtaLabel: "",
    primaryCtaLabelEn: "",
    primaryCtaHref: "",
    secondaryCtaLabel: "",
    secondaryCtaLabelEn: "",
    secondaryCtaHref: "",
    secondaryImage: "",
    secondaryImageAlt: "",
    secondaryImageAltEn: "",
  },
  stores: [],
  announcements: { enabled: true, items: [], itemsEn: [] },
  testimonials: { enabled: true, title: "", titleEn: "", items: [] },
};

const emptyTestimonial = (): SiteTestimonial => ({
  id: `t-${Date.now()}`,
  text: "",
  textEn: "",
  author: "",
  location: "",
  locationEn: "",
  productSku: "",
  rating: 5,
});

export default function AdminSiteContentPage() {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [documentsTitle, setDocumentsTitle] = useState("");
  const [documentsSubtitle, setDocumentsSubtitle] = useState("");
  const [documents, setDocuments] = useState<LandingDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [siteRes, landingRes] = await Promise.all([
        fetch("/api/admin/site-content"),
        fetch("/api/admin/webshop/landing-settings"),
      ]);
      const [siteJson, landingJson] = await Promise.all([siteRes.json(), landingRes.json()]);
      if (!siteJson?.success) throw new Error(siteJson?.message || "Ne mogu da ucitam site content.");
      if (!landingJson?.success) throw new Error(landingJson?.message || "Ne mogu da ucitam dokumenta.");
      setContent(siteJson.content || defaultContent);
      setDocumentsTitle(String(landingJson.settings?.documentsTitle || ""));
      setDocumentsSubtitle(String(landingJson.settings?.documentsSubtitle || ""));
      setDocuments(Array.isArray(landingJson.settings?.documents) ? landingJson.settings.documents : []);
    } catch (err: any) {
      setError(err?.message || "Greska pri ucitavanju.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const sitePayload = {
        ...content,
        navigation: {
          items: content.navigation.items
            .map((item) => ({
              href: item.href.trim(),
              label: item.label.trim(),
              labelEn: item.labelEn.trim() || item.label.trim(),
            }))
            .filter((item) => item.href && item.label),
        },
        footer: {
          ...content.footer,
          groups: content.footer.groups
            .map((group) => ({
              title: group.title.trim(),
              titleEn: group.titleEn.trim() || group.title.trim(),
              links: group.links
                .map((link) => ({
                  href: link.href.trim(),
                  label: link.label.trim(),
                  labelEn: link.labelEn.trim() || link.label.trim(),
                }))
                .filter((link) => link.href && link.label),
            }))
            .filter((group) => group.title && group.links.length),
        },
        aboutPage: {
          ...content.aboutPage,
          paragraphs: content.aboutPage.paragraphs.map((item) => item.trim()).filter(Boolean),
          paragraphsEn: content.aboutPage.paragraphsEn.map((item) => item.trim()).filter(Boolean),
        },
        announcements: {
          enabled: Boolean(content.announcements?.enabled),
          items: (content.announcements?.items || []).map((item) => item.trim()).filter(Boolean),
          itemsEn: (content.announcements?.itemsEn || []).map((item) => item.trim()).filter(Boolean),
        },
        testimonials: {
          enabled: Boolean(content.testimonials?.enabled),
          title: (content.testimonials?.title || "").trim(),
          titleEn: (content.testimonials?.titleEn || "").trim(),
          items: (content.testimonials?.items || [])
            .map((item) => ({
              id: (item.id || `t-${Math.random().toString(36).slice(2, 8)}`).trim(),
              text: (item.text || "").trim(),
              textEn: (item.textEn || "").trim() || (item.text || "").trim(),
              author: (item.author || "").trim(),
              location: (item.location || "").trim(),
              locationEn: (item.locationEn || "").trim() || (item.location || "").trim(),
              productSku: (item.productSku || "").trim(),
              rating: Number(item.rating) > 0 && Number(item.rating) <= 5 ? Math.round(Number(item.rating)) : 5,
            }))
            .filter((item) => item.text && item.author),
        },
        stores: content.stores
          .map((store) => ({
            ...store,
            slug: store.slug.trim().toLowerCase(),
            city: store.city.trim(),
            cityEn: store.cityEn.trim() || store.city.trim(),
            title: store.title.trim(),
            titleEn: store.titleEn.trim() || store.title.trim(),
            address: store.address.trim(),
            addressEn: store.addressEn.trim() || store.address.trim(),
            mapLabel: store.mapLabel.trim(),
            phone: store.phone.trim(),
            landline: store.landline?.trim() || "",
            email: store.email.trim(),
            hours: store.hours.map((item) => item.trim()).filter(Boolean),
            hoursEn: store.hoursEn.map((item) => item.trim()).filter(Boolean),
            mapEmbedUrl: store.mapEmbedUrl.trim(),
          }))
          .filter((store) => store.slug && store.city && store.title && store.address && store.phone && store.email && store.mapEmbedUrl),
      };

      const landingPayload = {
        documentsTitle: documentsTitle.trim(),
        documentsSubtitle: documentsSubtitle.trim(),
        documents: documents
          .map((item) => ({
            title: item.title.trim(),
            description: item.description.trim(),
            url: item.url.trim(),
          }))
          .filter((item) => item.title || item.description || item.url),
      };

      const [siteRes, landingRes] = await Promise.all([
        fetch("/api/admin/site-content", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sitePayload),
        }),
        fetch("/api/admin/webshop/landing-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(landingPayload),
        }),
      ]);
      const [siteJson, landingJson] = await Promise.all([siteRes.json(), landingRes.json()]);
      if (!siteJson?.success) throw new Error(siteJson?.message || "Site content nije sacuvan.");
      if (!landingJson?.success) throw new Error(landingJson?.message || "Dokumenta nisu sacuvana.");

      setContent(siteJson.content || defaultContent);
      setDocumentsTitle(String(landingJson.settings?.documentsTitle || ""));
      setDocumentsSubtitle(String(landingJson.settings?.documentsSubtitle || ""));
      setDocuments(Array.isArray(landingJson.settings?.documents) ? landingJson.settings.documents : []);
      setNotice("Site content i dokumenta su sacuvani.");
    } catch (err: any) {
      setError(err?.message || "Snimanje nije uspelo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className={cardClass}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">CMS</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Site Content</h1>
        <p className="mt-1 text-sm text-slate-600">
          Meni, footer, dokumenta, prodajna mesta i kljucne staticke stranice sada se vode iz jednog admin mesta.
        </p>
      </div>

      {loading ? <p className="text-sm text-slate-500">Ucitavanje...</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-600">{notice}</p> : null}

      <div className={cardClass}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Header meni</h2>
            <p className="text-sm text-slate-600">Redosled i nazivi glavne navigacije.</p>
          </div>
          <button onClick={() => setContent((prev) => ({ ...prev, navigation: { items: [...prev.navigation.items, emptyNav()] } }))} className={actionClass}>
            Dodaj stavku
          </button>
        </div>
        <div className="space-y-3">
          {content.navigation.items.map((item, index) => (
            <div key={`nav-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
              <input value={item.href} onChange={(e) => setContent((prev) => ({ ...prev, navigation: { items: prev.navigation.items.map((row, rowIndex) => rowIndex === index ? { ...row, href: e.target.value } : row) } }))} placeholder="/kontakt" className={fieldClass} />
              <input value={item.label} onChange={(e) => setContent((prev) => ({ ...prev, navigation: { items: prev.navigation.items.map((row, rowIndex) => rowIndex === index ? { ...row, label: e.target.value } : row) } }))} placeholder="SR label" className={fieldClass} />
              <input value={item.labelEn} onChange={(e) => setContent((prev) => ({ ...prev, navigation: { items: prev.navigation.items.map((row, rowIndex) => rowIndex === index ? { ...row, labelEn: e.target.value } : row) } }))} placeholder="EN label" className={fieldClass} />
              <button onClick={() => setContent((prev) => ({ ...prev, navigation: { items: prev.navigation.items.filter((_, rowIndex) => rowIndex !== index) } }))} className={dangerClass}>
                Obrisi
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Footer</h2>
          <p className="text-sm text-slate-600">Brend tekst, drustvene mreze i footer navigacija.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={content.footer.eyebrow} onChange={(e) => setContent((prev) => ({ ...prev, footer: { ...prev.footer, eyebrow: e.target.value } }))} placeholder="Eyebrow SR" className={fieldClass} />
          <input value={content.footer.eyebrowEn} onChange={(e) => setContent((prev) => ({ ...prev, footer: { ...prev.footer, eyebrowEn: e.target.value } }))} placeholder="Eyebrow EN" className={fieldClass} />
          <textarea value={content.footer.brandCopy} onChange={(e) => setContent((prev) => ({ ...prev, footer: { ...prev.footer, brandCopy: e.target.value } }))} placeholder="Footer copy SR" className={`${fieldClass} min-h-[90px]`} />
          <textarea value={content.footer.brandCopyEn} onChange={(e) => setContent((prev) => ({ ...prev, footer: { ...prev.footer, brandCopyEn: e.target.value } }))} placeholder="Footer copy EN" className={`${fieldClass} min-h-[90px]`} />
          <input value={content.footer.instagramUrl} onChange={(e) => setContent((prev) => ({ ...prev, footer: { ...prev.footer, instagramUrl: e.target.value } }))} placeholder="Instagram URL" className={fieldClass} />
          <input value={content.footer.facebookUrl} onChange={(e) => setContent((prev) => ({ ...prev, footer: { ...prev.footer, facebookUrl: e.target.value } }))} placeholder="Facebook URL" className={fieldClass} />
          <input value={content.footer.bottomTagline} onChange={(e) => setContent((prev) => ({ ...prev, footer: { ...prev.footer, bottomTagline: e.target.value } }))} placeholder="Bottom tagline SR" className={fieldClass} />
          <input value={content.footer.bottomTaglineEn} onChange={(e) => setContent((prev) => ({ ...prev, footer: { ...prev.footer, bottomTaglineEn: e.target.value } }))} placeholder="Bottom tagline EN" className={fieldClass} />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">Footer grupe</h3>
          <button onClick={() => setContent((prev) => ({ ...prev, footer: { ...prev.footer, groups: [...prev.footer.groups, emptyGroup()] } }))} className={actionClass}>
            Dodaj grupu
          </button>
        </div>
        <div className="mt-3 space-y-4">
          {content.footer.groups.map((group, groupIndex) => (
            <div key={`group-${groupIndex}`} className="rounded-2xl border border-slate-200 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input value={group.title} onChange={(e) => setContent((prev) => ({ ...prev, footer: { ...prev.footer, groups: prev.footer.groups.map((row, rowIndex) => rowIndex === groupIndex ? { ...row, title: e.target.value } : row) } }))} placeholder="Naslov SR" className={fieldClass} />
                <input value={group.titleEn} onChange={(e) => setContent((prev) => ({ ...prev, footer: { ...prev.footer, groups: prev.footer.groups.map((row, rowIndex) => rowIndex === groupIndex ? { ...row, titleEn: e.target.value } : row) } }))} placeholder="Naslov EN" className={fieldClass} />
                <button onClick={() => setContent((prev) => ({ ...prev, footer: { ...prev.footer, groups: prev.footer.groups.filter((_, rowIndex) => rowIndex !== groupIndex) } }))} className={dangerClass}>
                  Obrisi grupu
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {group.links.map((link, linkIndex) => (
                  <div key={`link-${groupIndex}-${linkIndex}`} className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                    <input value={link.href} onChange={(e) => setContent((prev) => ({ ...prev, footer: { ...prev.footer, groups: prev.footer.groups.map((row, rowIndex) => rowIndex === groupIndex ? { ...row, links: row.links.map((current, currentIndex) => currentIndex === linkIndex ? { ...current, href: e.target.value } : current) } : row) } }))} placeholder="/dokumenta" className={fieldClass} />
                    <input value={link.label} onChange={(e) => setContent((prev) => ({ ...prev, footer: { ...prev.footer, groups: prev.footer.groups.map((row, rowIndex) => rowIndex === groupIndex ? { ...row, links: row.links.map((current, currentIndex) => currentIndex === linkIndex ? { ...current, label: e.target.value } : current) } : row) } }))} placeholder="SR label" className={fieldClass} />
                    <input value={link.labelEn} onChange={(e) => setContent((prev) => ({ ...prev, footer: { ...prev.footer, groups: prev.footer.groups.map((row, rowIndex) => rowIndex === groupIndex ? { ...row, links: row.links.map((current, currentIndex) => currentIndex === linkIndex ? { ...current, labelEn: e.target.value } : current) } : row) } }))} placeholder="EN label" className={fieldClass} />
                    <button onClick={() => setContent((prev) => ({ ...prev, footer: { ...prev.footer, groups: prev.footer.groups.map((row, rowIndex) => rowIndex === groupIndex ? { ...row, links: row.links.filter((_, currentIndex) => currentIndex !== linkIndex) } : row) } }))} className={dangerClass}>
                      Obrisi
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => setContent((prev) => ({ ...prev, footer: { ...prev.footer, groups: prev.footer.groups.map((row, rowIndex) => rowIndex === groupIndex ? { ...row, links: [...row.links, emptyNav()] } : row) } }))} className={`mt-3 ${actionClass}`}>
                Dodaj link
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Prodajna mesta</h2>
            <p className="text-sm text-slate-600">Radnje, telefoni, mape i radno vreme za storefront i kontakt formu.</p>
          </div>
          <button onClick={() => setContent((prev) => ({ ...prev, stores: [...prev.stores, emptyStore()] }))} className={actionClass}>
            Dodaj radnju
          </button>
        </div>
        <div className="space-y-4">
          {content.stores.map((store, index) => (
            <div key={`store-${index}`} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex justify-end">
                <button onClick={() => setContent((prev) => ({ ...prev, stores: prev.stores.filter((_, rowIndex) => rowIndex !== index) }))} className={dangerClass}>
                  Obrisi radnju
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {(["slug","city","cityEn","title","titleEn","address","addressEn","mapLabel","phone","landline","email","mapEmbedUrl"] as Array<keyof SiteStoreLocation>).map((field) => (
                  <input
                    key={`${index}-${String(field)}`}
                    value={String(store[field] || "")}
                    onChange={(e) => setContent((prev) => ({ ...prev, stores: prev.stores.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: e.target.value } : row) }))}
                    placeholder={String(field)}
                    className={fieldClass}
                  />
                ))}
                <textarea value={store.hours.join("\n")} onChange={(e) => setContent((prev) => ({ ...prev, stores: prev.stores.map((row, rowIndex) => rowIndex === index ? { ...row, hours: e.target.value.split("\n") } : row) }))} placeholder="Radno vreme SR, jedan red = jedna stavka" className={`${fieldClass} min-h-[110px]`} />
                <textarea value={store.hoursEn.join("\n")} onChange={(e) => setContent((prev) => ({ ...prev, stores: prev.stores.map((row, rowIndex) => rowIndex === index ? { ...row, hoursEn: e.target.value.split("\n") } : row) }))} placeholder="Working hours EN, one line = one item" className={`${fieldClass} min-h-[110px]`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <h2 className="text-lg font-semibold text-slate-900">Kontakt, prodajna mesta i O nama</h2>
        <p className="mb-4 text-sm text-slate-600">Najvazniji tekstovi za staticke stranice iz starog CMS sloja.</p>

        <div className="grid gap-5">
          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">Kontakt strana</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {(["title","titleEn","detailsTitle","detailsTitleEn","formTitle","formTitleEn","preferredStorePlaceholder","preferredStorePlaceholderEn","onlineOptionLabel","onlineOptionLabelEn","submitLabel","submitLabelEn"] as Array<keyof SiteContent["contactPage"]>).map((field) => (
                <input key={`contact-${String(field)}`} value={content.contactPage[field]} onChange={(e) => setContent((prev) => ({ ...prev, contactPage: { ...prev.contactPage, [field]: e.target.value } }))} placeholder={String(field)} className={fieldClass} />
              ))}
              <textarea value={content.contactPage.intro} onChange={(e) => setContent((prev) => ({ ...prev, contactPage: { ...prev.contactPage, intro: e.target.value } }))} placeholder="Intro SR" className={`${fieldClass} min-h-[90px]`} />
              <textarea value={content.contactPage.introEn} onChange={(e) => setContent((prev) => ({ ...prev, contactPage: { ...prev.contactPage, introEn: e.target.value } }))} placeholder="Intro EN" className={`${fieldClass} min-h-[90px]`} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">Prodajna mesta strana</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {(["title","titleEn","callCtaLabel","callCtaLabelEn","contactCardTitle","contactCardTitleEn","hoursCardTitle","hoursCardTitleEn"] as Array<keyof SiteContent["storesPage"]>).map((field) => (
                <input key={`stores-${String(field)}`} value={content.storesPage[field]} onChange={(e) => setContent((prev) => ({ ...prev, storesPage: { ...prev.storesPage, [field]: e.target.value } }))} placeholder={String(field)} className={fieldClass} />
              ))}
              <textarea value={content.storesPage.intro} onChange={(e) => setContent((prev) => ({ ...prev, storesPage: { ...prev.storesPage, intro: e.target.value } }))} placeholder="Intro SR" className={`${fieldClass} min-h-[90px]`} />
              <textarea value={content.storesPage.introEn} onChange={(e) => setContent((prev) => ({ ...prev, storesPage: { ...prev.storesPage, introEn: e.target.value } }))} placeholder="Intro EN" className={`${fieldClass} min-h-[90px]`} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">O nama strana</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {(["heroImage","heroAlt","heroAltEn","heroTitle","heroTitleEn","heroSubtitle","heroSubtitleEn","introTitle","introTitleEn","primaryCtaLabel","primaryCtaLabelEn","primaryCtaHref","secondaryCtaLabel","secondaryCtaLabelEn","secondaryCtaHref","secondaryImage","secondaryImageAlt","secondaryImageAltEn"] as Array<Exclude<keyof SiteContent["aboutPage"], "paragraphs" | "paragraphsEn">>).map((field) => (
                <input key={`about-${String(field)}`} value={String(content.aboutPage[field] || "")} onChange={(e) => setContent((prev) => ({ ...prev, aboutPage: { ...prev.aboutPage, [field]: e.target.value } }))} placeholder={String(field)} className={fieldClass} />
              ))}
              <textarea value={content.aboutPage.paragraphs.join("\n")} onChange={(e) => setContent((prev) => ({ ...prev, aboutPage: { ...prev.aboutPage, paragraphs: e.target.value.split("\n") } }))} placeholder="Paragrafi SR, jedan red = jedan paragraf" className={`${fieldClass} min-h-[120px]`} />
              <textarea value={content.aboutPage.paragraphsEn.join("\n")} onChange={(e) => setContent((prev) => ({ ...prev, aboutPage: { ...prev.aboutPage, paragraphsEn: e.target.value.split("\n") } }))} placeholder="Paragraphs EN, one line = one paragraph" className={`${fieldClass} min-h-[120px]`} />
            </div>
          </section>
        </div>
      </div>

      <div className={cardClass}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Traka obavestenja (announcement bar)</h2>
            <p className="text-sm text-slate-600">
              Tanka crna traka iznad headera. Ostavi prazno da je sakrijes, ili ukljuci/iskljuci prekidacem.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(content.announcements?.enabled)}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  announcements: {
                    enabled: e.target.checked,
                    items: prev.announcements?.items ?? [],
                    itemsEn: prev.announcements?.itemsEn ?? [],
                  },
                }))
              }
            />
            Prikazi traku
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Poruke (SR) - jedna po redu, maksimalno 6
            </label>
            <textarea
              value={(content.announcements?.items || []).join("\n")}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  announcements: {
                    enabled: prev.announcements?.enabled ?? true,
                    items: e.target.value.split("\n"),
                    itemsEn: prev.announcements?.itemsEn ?? [],
                  },
                }))
              }
              placeholder="Besplatna dostava u celoj Srbiji za porudzbine preko 15.000 RSD"
              className={`${fieldClass} min-h-[110px]`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Messages (EN) - one per line
            </label>
            <textarea
              value={(content.announcements?.itemsEn || []).join("\n")}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  announcements: {
                    enabled: prev.announcements?.enabled ?? true,
                    items: prev.announcements?.items ?? [],
                    itemsEn: e.target.value.split("\n"),
                  },
                }))
              }
              placeholder="Free delivery across Serbia on orders over 15.000 RSD"
              className={`${fieldClass} min-h-[110px]`}
            />
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recenzije / social proof</h2>
            <p className="text-sm text-slate-600">
              Prikazuje se na stranici proizvoda (web shop) i na pocetnoj. Prikazi samo one koje imaju tekst i ime.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(content.testimonials?.enabled)}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev,
                    testimonials: {
                      ...(prev.testimonials || { enabled: true, title: "", titleEn: "", items: [] }),
                      enabled: e.target.checked,
                    },
                  }))
                }
              />
              Prikazi sekciju
            </label>
            <button
              type="button"
              onClick={() =>
                setContent((prev) => ({
                  ...prev,
                  testimonials: {
                    enabled: prev.testimonials?.enabled ?? true,
                    title: prev.testimonials?.title ?? "",
                    titleEn: prev.testimonials?.titleEn ?? "",
                    items: [...(prev.testimonials?.items || []), emptyTestimonial()],
                  },
                }))
              }
              className={actionClass}
            >
              Dodaj recenziju
            </button>
          </div>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <input
            value={content.testimonials?.title || ""}
            onChange={(e) =>
              setContent((prev) => ({
                ...prev,
                testimonials: {
                  ...(prev.testimonials || { enabled: true, title: "", titleEn: "", items: [] }),
                  title: e.target.value,
                },
              }))
            }
            placeholder="Naslov sekcije (SR) - npr. Sta kazu nasi kupci"
            className={fieldClass}
          />
          <input
            value={content.testimonials?.titleEn || ""}
            onChange={(e) =>
              setContent((prev) => ({
                ...prev,
                testimonials: {
                  ...(prev.testimonials || { enabled: true, title: "", titleEn: "", items: [] }),
                  titleEn: e.target.value,
                },
              }))
            }
            placeholder="Section title (EN)"
            className={fieldClass}
          />
        </div>
        <div className="space-y-3">
          {(content.testimonials?.items || []).map((item, index) => {
            const updateItem = (updates: Partial<SiteTestimonial>) => {
              setContent((prev) => ({
                ...prev,
                testimonials: {
                  ...(prev.testimonials || { enabled: true, title: "", titleEn: "", items: [] }),
                  items: (prev.testimonials?.items || []).map((it, i) => (i === index ? { ...it, ...updates } : it)),
                },
              }));
            };
            const removeItem = () => {
              setContent((prev) => ({
                ...prev,
                testimonials: {
                  ...(prev.testimonials || { enabled: true, title: "", titleEn: "", items: [] }),
                  items: (prev.testimonials?.items || []).filter((_, i) => i !== index),
                },
              }));
            };
            return (
              <div key={item.id || index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Recenzija #{index + 1}
                  </span>
                  <button type="button" onClick={removeItem} className="text-xs font-semibold text-rose-600 hover:text-rose-700">
                    Obrisi
                  </button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={item.author}
                    onChange={(e) => updateItem({ author: e.target.value })}
                    placeholder="Ime i prezime kupca"
                    className={fieldClass}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={item.location}
                      onChange={(e) => updateItem({ location: e.target.value })}
                      placeholder="Grad (SR)"
                      className={fieldClass}
                    />
                    <input
                      value={item.locationEn}
                      onChange={(e) => updateItem({ locationEn: e.target.value })}
                      placeholder="City (EN)"
                      className={fieldClass}
                    />
                  </div>
                  <textarea
                    value={item.text}
                    onChange={(e) => updateItem({ text: e.target.value })}
                    placeholder="Tekst recenzije (SR)"
                    className={`${fieldClass} min-h-[90px]`}
                  />
                  <textarea
                    value={item.textEn}
                    onChange={(e) => updateItem({ textEn: e.target.value })}
                    placeholder="Review text (EN)"
                    className={`${fieldClass} min-h-[90px]`}
                  />
                  <input
                    value={item.productSku}
                    onChange={(e) => updateItem({ productSku: e.target.value })}
                    placeholder="SKU ili ID proizvoda (opciono)"
                    className={fieldClass}
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    Ocena (1-5)
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={item.rating}
                      onChange={(e) => updateItem({ rating: Number(e.target.value) })}
                      className={`${fieldClass} w-24`}
                    />
                  </label>
                </div>
              </div>
            );
          })}
          {!content.testimonials?.items?.length ? (
            <p className="text-sm text-slate-500">Nema recenzija. Dodaj prvu klikom na dugme iznad.</p>
          ) : null}
        </div>
      </div>

      <div className={cardClass}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Dokumenta</h2>
            <p className="text-sm text-slate-600">Dokument CMS deo je vezan za postojeci landing settings storage.</p>
          </div>
          <button onClick={() => setDocuments((prev) => [...prev, emptyDocument()])} className={actionClass}>
            Dodaj dokument
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input value={documentsTitle} onChange={(e) => setDocumentsTitle(e.target.value)} placeholder="documentsTitle" className={fieldClass} />
          <input value={documentsSubtitle} onChange={(e) => setDocumentsSubtitle(e.target.value)} placeholder="documentsSubtitle" className={fieldClass} />
        </div>
        <div className="mt-4 space-y-3">
          {documents.map((item, index) => (
            <div key={`doc-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-3 md:grid-cols-[1fr_1.4fr_1.6fr_auto]">
              <input value={item.title} onChange={(e) => setDocuments((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, title: e.target.value } : row))} placeholder="Naslov" className={fieldClass} />
              <input value={item.description} onChange={(e) => setDocuments((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, description: e.target.value } : row))} placeholder="Opis" className={fieldClass} />
              <input value={item.url} onChange={(e) => setDocuments((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, url: e.target.value } : row))} placeholder="URL" className={fieldClass} />
              <button onClick={() => setDocuments((prev) => prev.filter((_, rowIndex) => rowIndex !== index))} className={dangerClass}>
                Obrisi
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={save} disabled={saving} className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
          {saving ? "Cuvanje..." : "Sacuvaj sve"}
        </button>
        <button onClick={() => void load()} className={actionClass}>
          Osvezi
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t border-blue-100 bg-white/95 px-6 py-3 shadow-lg backdrop-blur-sm">
        <span className="text-xs text-slate-500">Site Content</span>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
        >
          {saving ? "Cuvanje..." : "Sacuvaj sve"}
        </button>
      </div>
    </div>
  );
}
