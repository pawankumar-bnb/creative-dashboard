/* Relay — sample data generator (demo mode + first-run seed). Everything here
   is plainly marked as sample; the admin can remove it in Settings. */
(function (root) {
  const H = 3600e3;
  function build(now) {
    const t = (hoursAgo) => now - hoursAgo * H;
    const sw = { name: 'Sample writer', sample: true };
    const sd = { name: 'Sample designer', sample: true };
    const sm = { name: 'Sample marketer', sample: true };
    const requests = [
      {
        id: 'BB-0001', num: 1, sample: true, title: 'Diwali offer — Instagram carousel (5 slides)',
        type: 'Social post', priority: 'High', brief: 'Festive offer creatives for the Diwali construction package: 5-slide carousel, Bengaluru + Hyderabad audiences. Highlight zero-cost-overrun promise, 470+ quality checks, and the ₹50,000 booking benefit. Tone: warm, festive, trustworthy.',
        refs: ['https://www.bricknbolt.com/'], dueDate: isoDate(now + 3 * 24 * H), requester: sm, createdAt: t(70),
        stage: 'review', status: 'open', round: 2,
        assignees: { content: sw, creative: sd },
        visits: [
          { stage: 'intake', enteredAt: t(70), exitedAt: t(70), by: sm, action: 'submitted', round: 1 },
          { stage: 'content', enteredAt: t(70), exitedAt: t(52), by: sw, action: 'completed', round: 1, assignee: sw },
          { stage: 'creative', enteredAt: t(52), exitedAt: t(20), by: sd, action: 'completed', round: 1, assignee: sd },
          { stage: 'review', enteredAt: t(20), exitedAt: t(14), by: sm, action: 'edits', round: 1 },
          { stage: 'creative', enteredAt: t(14), exitedAt: t(3), by: sd, action: 'completed', round: 2, assignee: sd },
          { stage: 'review', enteredAt: t(3), exitedAt: null, round: 2 },
        ],
        deliverables: [
          { url: 'https://drive.google.com/drive/folders/sample-diwali-v1', label: 'Carousel v1 (Figma export)', by: sd, at: t(20), round: 1 },
          { url: 'https://drive.google.com/drive/folders/sample-diwali-v2', label: 'Carousel v2 — bigger offer badge', by: sd, at: t(3), round: 2 },
        ],
        thread: [
          { at: t(14), by: sm, kind: 'edit', text: 'Slide 2: the ₹50,000 benefit needs to be the hero, not the footer. Slide 5: add the site-visit CTA.' },
          { at: t(3), by: sd, kind: 'comment', text: 'Both fixed in v2. Offer badge is now 2× and the CTA slide has the WhatsApp number.' },
        ], updatedAt: t(3),
      },
      {
        id: 'BB-0002', num: 2, sample: true, title: 'Blog: What it costs to build a 30×40 house in Bengaluru (2026)',
        type: 'Blog / article', priority: 'Normal', brief: 'Long-form SEO article, ~1,800 words. Cover cost per sq ft by package, what changes the estimate (floors, finishes, soil), and a sample BOQ table. Target keyword: "30x40 house construction cost bangalore".',
        refs: [], dueDate: isoDate(now + 6 * 24 * H), requester: sm, createdAt: t(40),
        stage: 'content', status: 'open', round: 1,
        assignees: { content: sw },
        visits: [
          { stage: 'intake', enteredAt: t(40), exitedAt: t(40), by: sm, action: 'submitted', round: 1 },
          { stage: 'content', enteredAt: t(40), exitedAt: null, round: 1, assignee: sw },
        ],
        deliverables: [], thread: [
          { at: t(30), by: sw, kind: 'comment', text: 'Draft outline done. Need the latest per-sq-ft rates for Premium and Luxury packages before I finish the table.' },
        ], updatedAt: t(30),
      },
      {
        id: 'BB-0003', num: 3, sample: true, title: 'Hyderabad launch — Meta ad set (3 statics + 1 reel cover)',
        type: 'Ad creative', priority: 'Urgent', brief: 'Performance creatives for the Hyderabad city launch. 3 static variants (price-led, trust-led, timeline-led) at 1080×1080 and 1080×1920, plus a reel cover. Copy in English and Telugu.',
        refs: ['https://www.bricknbolt.com/hyderabad'], dueDate: isoDate(now + 1 * 24 * H), requester: sm, createdAt: t(58),
        stage: 'creative', status: 'open', round: 1,
        assignees: { content: sw },
        visits: [
          { stage: 'intake', enteredAt: t(58), exitedAt: t(58), by: sm, action: 'submitted', round: 1 },
          { stage: 'content', enteredAt: t(58), exitedAt: t(31), by: sw, action: 'completed', round: 1, assignee: sw },
          { stage: 'creative', enteredAt: t(31), exitedAt: null, round: 1 },
        ],
        deliverables: [], thread: [], updatedAt: t(31),
      },
      {
        id: 'BB-0004', num: 4, sample: true, title: 'Customer testimonial video — Ramesh family, Whitefield',
        type: 'Video', priority: 'Normal', brief: '90-second testimonial edit from the raw footage shot on site. Subtitles, brand outro, 16:9 for YouTube and 9:16 cut for Shorts.',
        refs: [], dueDate: isoDate(now - 1 * 24 * H), requester: sm, createdAt: t(120),
        stage: 'creative', status: 'open', round: 1,
        assignees: { content: sw, creative: sd },
        visits: [
          { stage: 'intake', enteredAt: t(120), exitedAt: t(120), by: sm, action: 'submitted', round: 1 },
          { stage: 'content', enteredAt: t(120), exitedAt: t(100), by: sw, action: 'completed', round: 1, assignee: sw },
          { stage: 'creative', enteredAt: t(100), exitedAt: null, round: 1, assignee: sd },
        ],
        deliverables: [], thread: [
          { at: t(40), by: sd, kind: 'comment', text: 'Waiting on the corrected family name spelling for the lower-third before I export.' },
        ], updatedAt: t(40),
      },
      {
        id: 'BB-0005', num: 5, sample: true, title: 'Monthly newsletter — September edition',
        type: 'Email', priority: 'Normal', brief: 'September customer newsletter: 3 project spotlights, one construction tip, and the referral programme reminder. Mailchimp-ready HTML.',
        refs: [], dueDate: isoDate(now - 2 * 24 * H), requester: sm, createdAt: t(150),
        stage: 'done', status: 'done', round: 1, completedAt: t(96),
        assignees: { content: sw, creative: sd },
        visits: [
          { stage: 'intake', enteredAt: t(150), exitedAt: t(150), by: sm, action: 'submitted', round: 1 },
          { stage: 'content', enteredAt: t(150), exitedAt: t(130), by: sw, action: 'completed', round: 1, assignee: sw },
          { stage: 'creative', enteredAt: t(130), exitedAt: t(104), by: sd, action: 'completed', round: 1, assignee: sd },
          { stage: 'review', enteredAt: t(104), exitedAt: t(96), by: sm, action: 'approved', round: 1 },
          { stage: 'done', enteredAt: t(96), exitedAt: null, round: 1 },
        ],
        deliverables: [{ url: 'https://drive.google.com/drive/folders/sample-newsletter-sep', label: 'Newsletter HTML + assets', by: sd, at: t(104), round: 1 }],
        thread: [{ at: t(96), by: sm, kind: 'approval', text: 'Approved — scheduled for Friday 10am.' }], updatedAt: t(96),
      },
      {
        id: 'BB-0006', num: 6, sample: true, title: 'Premium package brochure — print A4, 8 pages',
        type: 'Brochure / print', priority: 'Low', brief: 'Refresh of the Premium package brochure with the 2026 specifications, new material partners and updated warranty copy. Print-ready PDF with bleed.',
        refs: [], dueDate: isoDate(now + 12 * 24 * H), requester: sm, createdAt: t(6),
        stage: 'content', status: 'open', round: 1,
        assignees: {},
        visits: [
          { stage: 'intake', enteredAt: t(6), exitedAt: t(6), by: sm, action: 'submitted', round: 1 },
          { stage: 'content', enteredAt: t(6), exitedAt: null, round: 1 },
        ],
        deliverables: [], thread: [], updatedAt: t(6),
      },
      {
        id: 'BB-0007', num: 7, sample: true, title: 'Landing page hero — "Build with certainty" campaign',
        type: 'Landing page', priority: 'High', brief: 'Hero section copy + visual for the certainty campaign LP: headline, sub, 3 proof points, CTA. Desktop and mobile hero art.',
        refs: [], dueDate: isoDate(now + 4 * 24 * H), requester: sm, createdAt: t(200),
        stage: 'done', status: 'done', round: 2, completedAt: t(120),
        assignees: { content: sw, creative: sd },
        visits: [
          { stage: 'intake', enteredAt: t(200), exitedAt: t(200), by: sm, action: 'submitted', round: 1 },
          { stage: 'content', enteredAt: t(200), exitedAt: t(172), by: sw, action: 'completed', round: 1, assignee: sw },
          { stage: 'creative', enteredAt: t(172), exitedAt: t(150), by: sd, action: 'completed', round: 1, assignee: sd },
          { stage: 'review', enteredAt: t(150), exitedAt: t(140), by: sm, action: 'edits', round: 1 },
          { stage: 'creative', enteredAt: t(140), exitedAt: t(126), by: sd, action: 'completed', round: 2, assignee: sd },
          { stage: 'review', enteredAt: t(126), exitedAt: t(120), by: sm, action: 'approved', round: 2 },
          { stage: 'done', enteredAt: t(120), exitedAt: null, round: 2 },
        ],
        deliverables: [{ url: 'https://drive.google.com/drive/folders/sample-lp-hero', label: 'Hero art v2 (desktop + mobile)', by: sd, at: t(126), round: 2 }],
        thread: [
          { at: t(140), by: sm, kind: 'edit', text: 'Headline is good. The mobile hero crops the house — please re-frame.' },
          { at: t(120), by: sm, kind: 'approval', text: 'Approved.' },
        ], updatedAt: t(120),
      },
    ];
    return { requests };
  }
  function isoDate(ts) { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  // Demo-only teammates (example.com addresses — never real people)
  const demoMembers = [
    { email: 'pawankumar@bricknbolt.com', name: 'Pawan Kumar', roles: ['admin', 'requester'], active: true },
    { email: 'meera@example.com', name: 'Meera Iyer', roles: ['requester'], active: true, sample: true },
    { email: 'ananya@example.com', name: 'Ananya Rao', roles: ['content'], active: true, sample: true },
    { email: 'rohit@example.com', name: 'Rohit Menon', roles: ['creative'], active: true, sample: true },
  ];
  root.RelaySamples = { build, demoMembers };
})(typeof window !== 'undefined' ? window : module.exports);
