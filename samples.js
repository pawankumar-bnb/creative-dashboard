/* Relay — sample data (demo mode + first-run seed). Everything here is plainly
   marked `sample` and can be removed from Settings → Housekeeping. Names come
   from the branding team's tracker; sample actors carry no email. */
(function (root) {
  const H = 3600e3;
  const P = (name) => ({ name, sample: true });
  const sakshi = P('Sakshi'), manju = P('Manju'), yogesh = P('Yogesh'), pratyush = P('Pratyush'), dhanraj = P('Dhanraj');
  const abhinav = P('Abhinav'), siddharth = P('Siddharth'), dishika = P('Dishika'), preety = P('Preety'), kunal = P('Kunal');
  function isoDate(ts) { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function build(now) {
    const t = (h) => now - h * H;
    const base = (o) => ({ sample: true, priority: 'Normal', refs: [], deliverables: [], thread: [], assignees: {}, round: 1, status: 'open', ...o });
    const requests = [
      base({ id: 'BB-0001', num: 1, title: 'Diwali campaign — LP hero banners (desktop + mobile)', typeId: 'lp-banners', type: 'LP / Website banners', team: 'design', priority: 'High',
        request: 'Hero banners for the Diwali offer landing page. Desktop 1440×600 and mobile 750×900. Offer: ₹50,000 booking benefit + zero cost overrun.',
        brief: 'Two hero banners (desktop 1440×600, mobile 750×900) for the Diwali landing page. Lead with the ₹50,000 booking benefit, secondary line on zero cost overrun. Festive palette within brand, CTA "Book a free site visit". Export PNG + layered file.',
        dueDate: isoDate(now + 2 * 24 * H), requester: kunal, createdAt: t(30), stage: 'approval', tatHours: 24, assignedAt: t(28),
        assignees: { production: manju },
        visits: [
          { stage: 'intake', enteredAt: t(30), exitedAt: t(30), by: kunal, action: 'submitted', round: 1 },
          { stage: 'brief', enteredAt: t(30), exitedAt: t(28), by: sakshi, action: 'assigned', round: 1 },
          { stage: 'production', enteredAt: t(28), exitedAt: t(8), by: manju, action: 'submitted', round: 1, assignee: manju },
          { stage: 'qc', enteredAt: t(8), exitedAt: t(5), by: sakshi, action: 'approved', round: 1 },
          { stage: 'approval', enteredAt: t(5), exitedAt: null, round: 1 },
        ],
        deliverables: [{ url: 'https://drive.google.com/drive/folders/sample-diwali-lp-banners', label: 'Diwali LP banners — final PNG + PSD', by: manju, at: t(8), round: 1 }],
        thread: [{ at: t(29), by: sakshi, kind: 'comment', text: 'Kunal — confirming the mobile size is 750×900 and not 1080×1350?' }, { at: t(29), by: kunal, kind: 'comment', text: 'Yes, 750×900. Thanks!' }, { at: t(5), by: sakshi, kind: 'approval', text: 'QC done — copy and sizes verified.' }], updatedAt: t(5) }),
      base({ id: 'BB-0002', num: 2, title: 'September CRM — payment reminder creatives (3 variants)', typeId: 'crm', type: 'CRM creatives', team: 'design',
        request: 'Three WhatsApp + email creatives for the milestone payment reminder. Friendly tone, one variant per milestone.',
        brief: '3 creatives (1080×1080 WhatsApp + 600×300 email header) for milestone payment reminders: foundation, slab, finishing. Friendly, reassuring tone; include the customer-app deep link CTA.',
        dueDate: isoDate(now + 3 * 24 * H), requester: siddharth, createdAt: t(66), stage: 'production', tatHours: 72, assignedAt: t(60),
        assignees: { production: yogesh },
        visits: [
          { stage: 'intake', enteredAt: t(66), exitedAt: t(66), by: siddharth, action: 'submitted', round: 1 },
          { stage: 'brief', enteredAt: t(66), exitedAt: t(60), by: sakshi, action: 'assigned', round: 1 },
          { stage: 'production', enteredAt: t(60), exitedAt: null, round: 1, assignee: yogesh },
        ], thread: [], updatedAt: t(60) }),
      base({ id: 'BB-0003', num: 3, title: 'Hyderabad launch — performance GIFs (4 sizes)', typeId: 'perf-video', type: 'Performance GIFs / videos', team: 'video', priority: 'Urgent',
        request: 'Animated GIFs for the Hyderabad city launch ads — price-led message. 1080×1080, 1080×1920, 1200×628, 300×250.',
        brief: 'Four animated GIFs (≤3 s loop) for Meta and Google display: 1080×1080, 1080×1920, 1200×628, 300×250. Message: "Now building in Hyderabad — packages from ₹1,899/sq ft". End frame with CTA. Under 1 MB each.',
        dueDate: isoDate(now - 1 * 24 * H), requester: abhinav, createdAt: t(50), stage: 'production', tatHours: 24, assignedAt: t(46), round: 2,
        assignees: { production: pratyush },
        visits: [
          { stage: 'intake', enteredAt: t(50), exitedAt: t(50), by: abhinav, action: 'submitted', round: 1 },
          { stage: 'brief', enteredAt: t(50), exitedAt: t(46), by: sakshi, action: 'assigned', round: 1 },
          { stage: 'production', enteredAt: t(46), exitedAt: t(22), by: pratyush, action: 'submitted', round: 1, assignee: pratyush },
          { stage: 'qc', enteredAt: t(22), exitedAt: t(16), by: sakshi, action: 'edits', round: 1 },
          { stage: 'production', enteredAt: t(16), exitedAt: null, round: 2, assignee: pratyush },
        ],
        deliverables: [{ url: 'https://drive.google.com/drive/folders/sample-hyd-gifs-v1', label: 'Hyderabad GIFs v1', by: pratyush, at: t(22), round: 1 }],
        thread: [{ at: t(16), by: sakshi, kind: 'edit', text: 'Price text is cut off on the 300×250. Also the loop jumps on the end frame — please add a 0.5 s hold.' }], updatedAt: t(16) }),
      base({ id: 'BB-0004', num: 4, title: 'Ganesh Chaturthi wishes — social reel', typeId: 'social-video', type: 'Social media videos', team: 'video',
        request: 'Short festive wishes reel for Instagram and LinkedIn using site footage.',
        brief: '15 s vertical reel (1080×1920) with festive wishes over site b-roll, brand outro, subtitles. Deliver MP4 + cover frame.',
        dueDate: isoDate(now + 1 * 24 * H), requester: dishika, createdAt: t(24), stage: 'qc', tatHours: 24, assignedAt: t(22),
        assignees: { production: dhanraj },
        visits: [
          { stage: 'intake', enteredAt: t(24), exitedAt: t(24), by: dishika, action: 'submitted', round: 1 },
          { stage: 'brief', enteredAt: t(24), exitedAt: t(22), by: sakshi, action: 'assigned', round: 1 },
          { stage: 'production', enteredAt: t(22), exitedAt: t(4), by: dhanraj, action: 'submitted', round: 1, assignee: dhanraj },
          { stage: 'qc', enteredAt: t(4), exitedAt: null, round: 1 },
        ],
        deliverables: [{ url: 'https://drive.google.com/drive/folders/sample-ganesh-reel', label: 'Ganesh Chaturthi reel — MP4 + cover', by: dhanraj, at: t(4), round: 1 }], thread: [], updatedAt: t(4) }),
      base({ id: 'BB-0005', num: 5, title: 'Independence Day office event — highlights video', typeId: 'hr-events', type: 'HR event shoots (in-house)', team: 'video',
        request: 'Edit the office Independence Day celebration footage into a 60 s highlights video for LinkedIn.',
        brief: '60 s highlights edit (16:9 for LinkedIn + 9:16 cut), upbeat track, lower-thirds for the team leads, brand outro.',
        dueDate: isoDate(now - 5 * 24 * H), requester: preety, createdAt: t(160), stage: 'done', status: 'done', completedAt: t(120), tatHours: 24, assignedAt: t(156),
        assignees: { production: pratyush },
        visits: [
          { stage: 'intake', enteredAt: t(160), exitedAt: t(160), by: preety, action: 'submitted', round: 1 },
          { stage: 'brief', enteredAt: t(160), exitedAt: t(156), by: sakshi, action: 'assigned', round: 1 },
          { stage: 'production', enteredAt: t(156), exitedAt: t(134), by: pratyush, action: 'submitted', round: 1, assignee: pratyush },
          { stage: 'qc', enteredAt: t(134), exitedAt: t(128), by: sakshi, action: 'approved', round: 1 },
          { stage: 'approval', enteredAt: t(128), exitedAt: t(120), by: preety, action: 'approved', round: 1 },
          { stage: 'done', enteredAt: t(120), exitedAt: null, round: 1 },
        ],
        deliverables: [{ url: 'https://drive.google.com/drive/folders/sample-iday-highlights', label: 'Independence Day highlights — 16:9 + 9:16', by: pratyush, at: t(134), round: 1 }],
        thread: [{ at: t(120), by: preety, kind: 'approval', text: 'Lovely — approved.' }],
        result: { assignee: pratyush, team: 'video', targetHours: 24, actualHours: 22, firstRoundHours: 22, rounds: 1, met: true, approvedAt: t(120), approvedBy: preety, stageHours: { brief: 4, production: 22, qc: 6, approval: 8 }, totalHours: 40 }, updatedAt: t(120) }),
      base({ id: 'BB-0006', num: 6, title: 'Channel partner pitch deck — 12 slides', typeId: 'decks', type: 'Decks / Pitch brochures', team: 'design',
        request: 'Refresh the channel partner deck with 2026 packages, new project photos and the referral programme slide.',
        brief: '', dueDate: isoDate(now + 6 * 24 * H), requester: siddharth, createdAt: t(3), stage: 'brief', tatHours: 96,
        visits: [
          { stage: 'intake', enteredAt: t(3), exitedAt: t(3), by: siddharth, action: 'submitted', round: 1 },
          { stage: 'brief', enteredAt: t(3), exitedAt: null, round: 1 },
        ], thread: [], updatedAt: t(3) }),
      base({ id: 'BB-0007', num: 7, title: 'Performance creatives — Bengaluru villa campaign (6 statics)', typeId: 'performance', type: 'Performance creatives', team: 'design',
        request: 'Six static ad variants for the villa construction campaign: 3 messages × 2 sizes.',
        brief: '6 statics (1080×1080 and 1080×1920): price-led, trust-led (470+ quality checks), timeline-led. English + Kannada copy. Export JPG under 500 KB.',
        dueDate: isoDate(now - 8 * 24 * H), requester: abhinav, createdAt: t(260), stage: 'done', status: 'done', completedAt: t(150), tatHours: 72, assignedAt: t(250), round: 2,
        assignees: { production: manju },
        visits: [
          { stage: 'intake', enteredAt: t(260), exitedAt: t(260), by: abhinav, action: 'submitted', round: 1 },
          { stage: 'brief', enteredAt: t(260), exitedAt: t(250), by: sakshi, action: 'assigned', round: 1 },
          { stage: 'production', enteredAt: t(250), exitedAt: t(190), by: manju, action: 'submitted', round: 1, assignee: manju },
          { stage: 'qc', enteredAt: t(190), exitedAt: t(186), by: sakshi, action: 'approved', round: 1 },
          { stage: 'approval', enteredAt: t(186), exitedAt: t(180), by: abhinav, action: 'edits', round: 1 },
          { stage: 'production', enteredAt: t(180), exitedAt: t(160), by: manju, action: 'submitted', round: 2, assignee: manju },
          { stage: 'qc', enteredAt: t(160), exitedAt: t(156), by: sakshi, action: 'approved', round: 2 },
          { stage: 'approval', enteredAt: t(156), exitedAt: t(150), by: abhinav, action: 'approved', round: 2 },
          { stage: 'done', enteredAt: t(150), exitedAt: null, round: 2 },
        ],
        deliverables: [{ url: 'https://drive.google.com/drive/folders/sample-villa-statics-v1', label: 'Villa statics v1', by: manju, at: t(190), round: 1 }, { url: 'https://drive.google.com/drive/folders/sample-villa-statics-v2', label: 'Villa statics v2 — Kannada fixes', by: manju, at: t(160), round: 2 }],
        thread: [{ at: t(180), by: abhinav, kind: 'edit', text: 'Kannada copy on the trust-led variant has a typo in "ಗುಣಮಟ್ಟ". Please fix and re-export.' }, { at: t(150), by: abhinav, kind: 'approval', text: 'Approved. Going live Monday.' }],
        result: { assignee: manju, team: 'design', targetHours: 72, actualHours: 80, firstRoundHours: 60, rounds: 2, met: false, approvedAt: t(150), approvedBy: abhinav, stageHours: { brief: 10, production: 80, qc: 8, approval: 12 }, totalHours: 110 }, updatedAt: t(150) }),
      base({ id: 'BB-0008', num: 8, title: 'CRM onboarding drip — email headers (5)', typeId: 'crm', type: 'CRM creatives', team: 'design',
        request: 'Header images for the 5-email onboarding drip for new customers.',
        brief: '', dueDate: isoDate(now + 5 * 24 * H), requester: siddharth, createdAt: t(31), stage: 'brief', tatHours: 72,
        visits: [
          { stage: 'intake', enteredAt: t(31), exitedAt: t(31), by: siddharth, action: 'submitted', round: 1 },
          { stage: 'brief', enteredAt: t(31), exitedAt: null, round: 1 },
        ], thread: [], updatedAt: t(31) }),
    ];
    return { requests };
  }
  // Roster from the branding team's tracker. Emails are placeholders until the admin confirms them.
  const roster = [
    { email: 'pawankumar@bricknbolt.com', name: 'Pawan Kumar', roles: ['admin', 'requester'], active: true },
    { email: 'sakshi@bricknbolt.com', name: 'Sakshi', roles: ['coordinator', 'requester'], active: true, emailUnconfirmed: true },
    { email: 'manju@bricknbolt.com', name: 'Manju', roles: ['design'], active: true, emailUnconfirmed: true },
    { email: 'yogesh@bricknbolt.com', name: 'Yogesh', roles: ['design'], active: true, emailUnconfirmed: true },
    { email: 'pratyush@bricknbolt.com', name: 'Pratyush', roles: ['video'], active: true, emailUnconfirmed: true },
    { email: 'dhanraj@bricknbolt.com', name: 'Dhanraj', roles: ['video'], active: true, emailUnconfirmed: true },
    { email: 'abhinav@bricknbolt.com', name: 'Abhinav', roles: ['requester'], active: true, emailUnconfirmed: true },
    { email: 'kunal@bricknbolt.com', name: 'Kunal', roles: ['requester'], active: true, emailUnconfirmed: true },
    { email: 'siddharth@bricknbolt.com', name: 'Siddharth', roles: ['requester'], active: true, emailUnconfirmed: true },
    { email: 'dishika@bricknbolt.com', name: 'Dishika', roles: ['requester'], active: true, emailUnconfirmed: true },
    { email: 'preety@bricknbolt.com', name: 'Preety', roles: ['requester'], active: true, emailUnconfirmed: true },
    { email: 'jayesh@bricknbolt.com', name: 'Jayesh', roles: ['requester'], active: true, emailUnconfirmed: true },
  ];
  root.RelaySamples = { build, roster };
})(typeof window !== 'undefined' ? window : module.exports);
