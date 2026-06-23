/**
 * Mock data for development — all student flows work without Supabase.
 * Replace with real Supabase queries when connecting.
 */

import type {
  ContentItem,
  Question,
  User,
  BattleRoom,
  BattleResult,
  BotProfile,
  UserTopicMastery,
  DailyUserActivity,
  TopicTag,
} from "@/lib/types/database";

// ============================================================
// MOCK USER
// ============================================================
export const MOCK_USER: User = {
  id: "mock-user-001",
  display_name: "Aspirant",
  avatar_url: null,
  rating: 1050,
  xp: 240,
  streak_current: 3,
  streak_best: 7,
  streak_last_date: new Date().toISOString().split("T")[0],
  league: "bronze",
  battles_played: 8,
  battles_won: 5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ============================================================
// MOCK CONTENT ITEMS (15 real CLAT-relevant topics)
// ============================================================
export const MOCK_CONTENT: ContentItem[] = [
  {
    id: "c1",
    slug: "sc-upholds-new-criminal-laws",
    title: "Supreme Court Upholds Validity of New Criminal Laws",
    summary:
      "The Supreme Court upheld the constitutional validity of the Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), and Bharatiya Sakshya Adhiniyam (BSA). These three laws replace the colonial-era IPC, CrPC, and Indian Evidence Act respectively. The Court ruled that Parliament has legislative competence under the Union List to enact these comprehensive criminal law reforms.",
    body: `## Background

The Indian Penal Code (IPC, 1860), Code of Criminal Procedure (CrPC, 1973), and Indian Evidence Act (1872) governed India's criminal justice system for over a century. In 2023, Parliament passed three new laws to replace them as part of a broader decolonization initiative.

## Key Facts

- **Bharatiya Nyaya Sanhita (BNS)** replaces the Indian Penal Code (1860)
- **Bharatiya Nagarik Suraksha Sanhita (BNSS)** replaces the Code of Criminal Procedure (1973)
- **Bharatiya Sakshya Adhiniyam (BSA)** replaces the Indian Evidence Act (1872)
- All three laws came into effect on July 1, 2024
- The BNS introduces community service as a form of punishment for the first time
- Zero FIR provision allows filing complaints at any police station regardless of jurisdiction

## CLAT Relevance

This topic is critical for CLAT preparation as it involves:
- Parliament's legislative competence under Article 246 read with the Seventh Schedule (Union List, Entry 1 — Criminal Law)
- The doctrine of separation of powers and judicial review of legislation
- Fundamental rights implications under Articles 14 (equality), 19 (freedoms), and 21 (life and liberty)
- Understanding of the federal structure and concurrent jurisdiction over criminal law

## Key Takeaways

1. Parliament acted within its constitutional authority to overhaul criminal laws
2. The new laws modernize criminal justice with provisions for electronic evidence and digital FIRs
3. Community service as punishment reflects a reformative approach to justice
4. The zero FIR provision addresses jurisdictional barriers in filing complaints`,
    why_it_matters:
      "Tests knowledge of criminal law reforms, Parliament's legislative competence under Article 246, and constitutional validity of central legislation.",
    topic_tags: ["legal"],
    source_urls: ["https://livelaw.in", "https://barandbench.com"],
    citations: [
      { source: "LiveLaw", url: "https://livelaw.in" },
      { source: "Bar and Bench", url: "https://barandbench.com" },
    ],
    image_url: null,
    difficulty: "medium",
    status: "published",
    reviewed_by: null,
    review_notes: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c2",
    slug: "india-unsc-non-permanent-member",
    title: "India Elected to UN Security Council for 2028-29 Term",
    summary:
      "India secured 182 out of 190 votes in the UN General Assembly to win a non-permanent seat on the Security Council for the 2028-29 term. This is India's eighth stint on the UNSC. India continues to advocate for permanent membership and comprehensive UNSC reform, including expansion of both permanent and non-permanent categories to reflect contemporary geopolitical realities.",
    body: `## Background

The UN Security Council has 15 members: 5 permanent (P5) with veto power — USA, UK, France, Russia, China — and 10 non-permanent members elected for two-year terms. India has been one of the most vocal advocates for UNSC reform and its own permanent membership.

## Key Facts

- India received 182 of 190 votes — highest margin for any candidate this election cycle
- This is India's 8th term as a non-permanent member since independence
- India's last term was 2021-22, during which it presided as Council President twice
- India's candidacy was endorsed by the Asia-Pacific Group unanimously
- India has called for expanding permanent seats to include India, Brazil, Germany, and Japan (G4 nations)

## CLAT Relevance

- Structure and functioning of the UN Security Council under Chapter V of the UN Charter
- India's foreign policy positions on multilateral reform
- Difference between permanent and non-permanent members, veto power
- The G4 proposal for UNSC expansion
- Concept of collective security under the UN framework

## Key Takeaways

1. India's consistent election to the UNSC reflects its growing global diplomatic weight
2. The demand for permanent membership is tied to India's claim as the world's most populous democracy
3. UNSC reform remains blocked primarily by China's opposition to India's permanent membership
4. Non-permanent members serve two-year terms and cannot exercise veto power`,
    why_it_matters:
      "Frequently tested in CLAT — covers India's role in international organizations, UNSC structure, and the permanent membership debate.",
    topic_tags: ["international"],
    source_urls: ["https://mea.gov.in", "https://un.org"],
    citations: [
      { source: "Ministry of External Affairs", url: "https://mea.gov.in" },
    ],
    image_url: null,
    difficulty: "easy",
    status: "published",
    reviewed_by: null,
    review_notes: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c3",
    slug: "rbi-repo-rate-steady",
    title: "RBI Maintains Repo Rate at 6.5% for Tenth Consecutive Meeting",
    summary:
      "The Reserve Bank of India's Monetary Policy Committee voted 4-2 to keep the repo rate unchanged at 6.5%, marking the tenth consecutive meeting without a change. Governor Das cited persistent food inflation and global economic uncertainty. The MPC revised GDP growth forecast upward to 7.2% for FY25 while maintaining its stance of 'withdrawal of accommodation'.",
    body: `## Background

The Monetary Policy Committee (MPC) is a statutory body constituted under Section 45ZB of the RBI Act, 1934. It has six members — three from the RBI (including the Governor as chairperson) and three external members appointed by the Central Government. The MPC is mandated to maintain inflation within the target of 4% (±2%).

## Key Facts

- Repo rate held at 6.5% — unchanged since February 2023
- The decision was by a 4-2 majority (two members voted for a 25bps cut)
- Standing Deposit Facility (SDF) rate remains at 6.25%
- Marginal Standing Facility (MSF) rate remains at 6.75%
- CPI inflation projected at 4.5% for FY25
- GDP growth forecast revised upward from 7% to 7.2%

## CLAT Relevance

- Understanding of monetary policy tools: repo rate, reverse repo rate, CRR, SLR
- The MPC framework under the amended RBI Act
- Inflation targeting and the statutory mandate of 4% ± 2%
- Relationship between interest rates, inflation, and economic growth
- Governor's casting vote provision in case of a tie

## Key Takeaways

1. The RBI is balancing growth support with inflation control
2. Food inflation remains the primary concern preventing rate cuts
3. India's growth outlook remains robust relative to global peers
4. The MPC framework ensures transparency and accountability in monetary policy`,
    why_it_matters:
      "Tests understanding of the RBI's monetary policy framework, the MPC structure under the RBI Act, and the repo rate mechanism.",
    topic_tags: ["economy"],
    source_urls: ["https://rbi.org.in"],
    citations: [{ source: "RBI", url: "https://rbi.org.in" }],
    image_url: null,
    difficulty: "medium",
    status: "published",
    reviewed_by: null,
    review_notes: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c4",
    slug: "parliament-amends-nep",
    title: "Parliament Passes Amendments to National Education Policy",
    summary:
      "Parliament approved amendments to the National Education Policy 2020, introducing a four-year integrated law programme after Class 12 and formalizing multidisciplinary legal education. The amendments establish the National Higher Education Regulatory Council (NHERC) to replace the UGC and AICTE, and operationalize the Academic Bank of Credits (ABC) for credit transfer across institutions.",
    body: `## Background

The National Education Policy (NEP) 2020 was India's first comprehensive education policy after 34 years, replacing the National Policy on Education 1986. It proposed sweeping changes across school and higher education, including a new regulatory framework, credit-based systems, and multidisciplinary approach.

## Key Facts

- The four-year integrated law programme allows students to begin legal education directly after Class 12
- NHERC will be a single regulatory body replacing UGC, AICTE, and other domain-specific regulators
- The Academic Bank of Credits enables students to earn and transfer credits across institutions
- The amendments strengthen the autonomy of higher education institutions
- Medical and legal education will retain separate professional oversight bodies

## CLAT Relevance

- Impact on legal education structure in India — direct relevance for CLAT aspirants
- Understanding of regulatory framework: UGC, AICTE, and the proposed NHERC
- Federal distribution of powers — Education moved from State List to Concurrent List by the 42nd Amendment
- Right to Education under Article 21A and the RTE Act
- Policy vs. legislation — NEP is a policy framework, not a statute

## Key Takeaways

1. The four-year integrated law programme creates a new pathway for legal education
2. Regulatory consolidation aims to reduce bureaucratic overlap in higher education
3. The Academic Bank of Credits supports student mobility across institutions
4. These changes directly affect the landscape of legal education that CLAT aspirants will enter`,
    why_it_matters:
      "Directly impacts legal education structure in India — relevant for understanding regulatory framework and education policy under the Constitution.",
    topic_tags: ["polity"],
    source_urls: ["https://pib.gov.in", "https://education.gov.in"],
    citations: [
      { source: "Press Information Bureau", url: "https://pib.gov.in" },
    ],
    image_url: null,
    difficulty: "easy",
    status: "published",
    reviewed_by: null,
    review_notes: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c5",
    slug: "cop29-climate-finance",
    title: "COP29 Agrees on $300 Billion Annual Climate Finance Goal",
    summary:
      "The COP29 climate summit in Baku concluded with a new climate finance agreement setting a $300 billion annual target by 2035 for developing nations. India and other developing countries criticized the amount as inadequate, demanding at least $1 trillion. The agreement also operationalized Article 6 carbon trading mechanisms and advanced the Loss and Damage Fund established at COP28.",
    body: `## Background

The Conference of Parties (COP) is the supreme decision-making body of the United Nations Framework Convention on Climate Change (UNFCCC). COP29 was held in Baku, Azerbaijan. A central agenda item was setting a New Collective Quantified Goal (NCQG) for climate finance to replace the expired $100 billion annual target.

## Key Facts

- New target: $300 billion annually by 2035 from developed to developing countries
- Previous target of $100 billion/year (set in 2009) was only met in 2022, three years late
- India, along with the Africa Group and AOSIS, demanded $1 trillion per year
- Article 6 of the Paris Agreement was operationalized, creating international carbon credit trading rules
- The Loss and Damage Fund (established at COP28 in Dubai) received additional pledges totaling $700 million
- India's NDC (Nationally Determined Contribution) targets 50% non-fossil fuel power capacity by 2030

## CLAT Relevance

- UNFCCC framework and the Paris Agreement structure
- Common But Differentiated Responsibilities (CBDR) principle
- India's climate diplomacy and negotiation positions
- International environmental law and treaty obligations
- Sustainable development vs. climate justice debate

## Key Takeaways

1. The $300 billion target represents a compromise but is well below developing countries' demands
2. Carbon trading under Article 6 could unlock private climate investment at scale
3. Climate finance remains the most contentious issue in global climate negotiations
4. India positions itself as a voice for climate justice while pursuing ambitious renewable energy targets`,
    why_it_matters:
      "Tests knowledge of international environmental agreements, India's climate diplomacy, and the UNFCCC framework — a recurring CLAT topic.",
    topic_tags: ["environment", "international"],
    source_urls: ["https://unfccc.int"],
    citations: [{ source: "UNFCCC", url: "https://unfccc.int" }],
    image_url: null,
    difficulty: "medium",
    status: "published",
    reviewed_by: null,
    review_notes: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c6",
    slug: "election-commission-one-nation-one-election",
    title: "Law Commission Recommends 'One Nation, One Election' Framework",
    summary:
      "The Law Commission of India submitted its report recommending simultaneous elections for the Lok Sabha and State Assemblies. The report proposes constitutional amendments to Articles 83, 85, 172, 174, and 356 to synchronize electoral cycles. The recommendation follows the Kovind Committee report and requires ratification by at least half the state legislatures under Article 368.",
    body: null,
    why_it_matters:
      "Tests constitutional amendment process under Article 368, federal structure, and Election Commission powers — high-probability CLAT topics.",
    topic_tags: ["polity"],
    source_urls: ["https://lci.gov.in"],
    citations: [
      { source: "Law Commission of India", url: "https://lci.gov.in" },
    ],
    image_url: null,
    difficulty: "hard",
    status: "published",
    reviewed_by: null,
    review_notes: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c7",
    slug: "sebi-insider-trading-rules",
    title: "SEBI Tightens Insider Trading Rules for Listed Companies",
    summary:
      "The Securities and Exchange Board of India amended the Prohibition of Insider Trading Regulations to expand the definition of 'connected persons' and introduce stricter disclosure requirements. Key changes include mandatory pre-clearance for trades above Rs 10 lakh, a 48-hour cooling-off period after accessing unpublished price-sensitive information (UPSI), and enhanced whistleblower protections.",
    body: null,
    why_it_matters:
      "Tests knowledge of SEBI's regulatory framework, insider trading law, and securities market regulation — relevant for legal reasoning section.",
    topic_tags: ["legal", "economy"],
    source_urls: ["https://sebi.gov.in"],
    citations: [{ source: "SEBI", url: "https://sebi.gov.in" }],
    image_url: null,
    difficulty: "hard",
    status: "published",
    reviewed_by: null,
    review_notes: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c8",
    slug: "india-free-trade-uk",
    title: "India and UK Sign Free Trade Agreement After 3 Years of Talks",
    summary:
      "India and the United Kingdom signed a comprehensive Free Trade Agreement (FTA) covering goods, services, and investment. The deal eliminates tariffs on 85% of UK goods entering India over 10 years and grants Indian IT professionals easier work visa access. Key sectors covered include textiles, pharmaceuticals, whisky, and financial services.",
    body: null,
    why_it_matters:
      "Tests understanding of international trade agreements, WTO framework, and India's trade policy — relevant for economy and international affairs sections.",
    topic_tags: ["international", "economy"],
    source_urls: ["https://commerce.gov.in"],
    citations: [
      {
        source: "Department of Commerce",
        url: "https://commerce.gov.in",
      },
    ],
    image_url: null,
    difficulty: "medium",
    status: "published",
    reviewed_by: null,
    review_notes: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c9",
    slug: "sc-right-to-privacy-aadhaar",
    title: "SC Reinforces Right to Privacy in Aadhaar Data Collection Case",
    summary:
      "The Supreme Court ruled that collecting biometric data beyond what is strictly necessary for identity verification violates the right to privacy under Article 21. The judgment strengthened the Puttaswamy framework by holding that data minimization is a constitutional requirement, not merely a policy preference, and directed UIDAI to delete excess biometric records within six months.",
    body: null,
    why_it_matters:
      "Builds on Puttaswamy (2017) right to privacy judgment — tests proportionality doctrine, Article 21 interpretation, and data protection principles.",
    topic_tags: ["legal", "polity"],
    source_urls: ["https://sci.gov.in"],
    citations: [
      { source: "Supreme Court of India", url: "https://sci.gov.in" },
    ],
    image_url: null,
    difficulty: "hard",
    status: "published",
    reviewed_by: null,
    review_notes: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c10",
    slug: "world-bank-india-growth",
    title: "World Bank Raises India's Growth Forecast to 7% for FY26",
    summary:
      "The World Bank upgraded India's GDP growth projection to 7% for FY2025-26 in its latest Global Economic Prospects report, citing strong domestic demand, government capital expenditure, and improving rural consumption. India remains the fastest-growing major economy, outpacing China (4.5%) and the global average (2.7%).",
    body: null,
    why_it_matters:
      "Tests knowledge of international economic institutions (World Bank, IMF), India's macroeconomic indicators, and global economic comparisons.",
    topic_tags: ["economy", "international"],
    source_urls: ["https://worldbank.org"],
    citations: [{ source: "World Bank", url: "https://worldbank.org" }],
    image_url: null,
    difficulty: "easy",
    status: "published",
    reviewed_by: null,
    review_notes: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c11",
    slug: "niti-aayog-sdg-index",
    title: "NITI Aayog Releases SDG India Index 2025",
    summary:
      "NITI Aayog published its annual SDG India Index, ranking states on their progress toward the UN Sustainable Development Goals. Kerala topped the rankings for the fourth consecutive year with a score of 79, followed by Tamil Nadu (76) and Himachal Pradesh (74). Bihar, Jharkhand, and Uttar Pradesh remained at the bottom. India's composite score improved from 66 to 71.",
    body: null,
    why_it_matters:
      "Tests knowledge of NITI Aayog's role, the SDG framework, and comparative state performance — common in current affairs sections.",
    topic_tags: ["reports", "polity"],
    source_urls: ["https://niti.gov.in"],
    citations: [{ source: "NITI Aayog", url: "https://niti.gov.in" }],
    image_url: null,
    difficulty: "easy",
    status: "published",
    reviewed_by: null,
    review_notes: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c12",
    slug: "padma-awards-2025",
    title: "Padma Awards 2025: Key Recipients and Their Contributions",
    summary:
      "The Government of India announced the Padma Awards for 2025, conferring 7 Padma Vibhushan, 19 Padma Bhushan, and 113 Padma Shri awards. Notable recipients include a 98-year-old tribal rights activist from Odisha, a pioneering AI researcher, and several grassroots educators. The awards recognize contributions across art, social work, public affairs, science, trade, and medicine.",
    body: null,
    why_it_matters:
      "Padma Awards are frequently tested in CLAT GK — tests knowledge of national civilian honors and notable Indians in various fields.",
    topic_tags: ["awards"],
    source_urls: ["https://padmaawards.gov.in"],
    citations: [
      { source: "Padma Awards Portal", url: "https://padmaawards.gov.in" },
    ],
    image_url: null,
    difficulty: "easy",
    status: "published",
    reviewed_by: null,
    review_notes: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ============================================================
// MOCK QUESTIONS (3-5 per content item, ~50 total)
// ============================================================
export const MOCK_QUESTIONS: Question[] = [
  // Questions for c1 — SC Criminal Laws
  {
    id: "q1",
    content_item_id: "c1",
    prompt:
      "Which of the following laws replaced the Indian Penal Code (1860)?",
    options: [
      { label: "A", text: "Bharatiya Nyaya Sanhita" },
      { label: "B", text: "Bharatiya Nagarik Suraksha Sanhita" },
      { label: "C", text: "Bharatiya Sakshya Adhiniyam" },
      { label: "D", text: "Bharatiya Dand Sanhita" },
    ],
    correct_option: "A",
    explanation:
      "The Bharatiya Nyaya Sanhita (BNS) replaced the Indian Penal Code (1860). The BNSS replaced CrPC, and the BSA replaced the Indian Evidence Act.",
    topic: "legal",
    difficulty: "easy",
    source_citation: "LiveLaw",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  {
    id: "q2",
    content_item_id: "c1",
    prompt:
      "Under which entry of the Seventh Schedule does Parliament derive its power to enact criminal laws?",
    options: [
      { label: "A", text: "State List, Entry 1" },
      { label: "B", text: "Union List, Entry 1" },
      { label: "C", text: "Concurrent List, Entry 1" },
      { label: "D", text: "Concurrent List, Entry 2" },
    ],
    correct_option: "C",
    explanation:
      "Criminal law is in the Concurrent List (Entry 1), meaning both Parliament and State Legislatures can legislate on it. However, in case of conflict, the central law prevails under Article 254.",
    topic: "legal",
    difficulty: "medium",
    source_citation: "Constitution of India, Seventh Schedule",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  {
    id: "q3",
    content_item_id: "c1",
    prompt:
      "Which new form of punishment was introduced for the first time by the Bharatiya Nyaya Sanhita?",
    options: [
      { label: "A", text: "Electronic monitoring" },
      { label: "B", text: "Community service" },
      { label: "C", text: "House arrest" },
      { label: "D", text: "Mandatory counseling" },
    ],
    correct_option: "B",
    explanation:
      "The BNS introduced community service as a new form of punishment for the first time in Indian criminal law, reflecting a reformative approach to justice.",
    topic: "legal",
    difficulty: "easy",
    source_citation: "Bar and Bench",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  // Questions for c2 — India UNSC
  {
    id: "q4",
    content_item_id: "c2",
    prompt:
      "How many non-permanent members does the UN Security Council have?",
    options: [
      { label: "A", text: "5" },
      { label: "B", text: "10" },
      { label: "C", text: "15" },
      { label: "D", text: "6" },
    ],
    correct_option: "B",
    explanation:
      "The UNSC has 15 members total: 5 permanent members (P5) with veto power and 10 non-permanent members elected for two-year terms by the General Assembly.",
    topic: "international",
    difficulty: "easy",
    source_citation: "UN Charter, Chapter V",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  {
    id: "q5",
    content_item_id: "c2",
    prompt:
      "Which group of countries, including India, jointly advocates for permanent UNSC membership?",
    options: [
      { label: "A", text: "BRICS" },
      { label: "B", text: "G4 (India, Brazil, Germany, Japan)" },
      { label: "C", text: "G7" },
      { label: "D", text: "NAM" },
    ],
    correct_option: "B",
    explanation:
      "The G4 nations — India, Brazil, Germany, and Japan — jointly advocate for permanent membership in a reformed UN Security Council.",
    topic: "international",
    difficulty: "medium",
    source_citation: "MEA",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  // Questions for c3 — RBI Repo Rate
  {
    id: "q6",
    content_item_id: "c3",
    prompt:
      "Under which section of the RBI Act was the Monetary Policy Committee constituted?",
    options: [
      { label: "A", text: "Section 22" },
      { label: "B", text: "Section 42" },
      { label: "C", text: "Section 45ZB" },
      { label: "D", text: "Section 24" },
    ],
    correct_option: "C",
    explanation:
      "The MPC was constituted under Section 45ZB of the RBI Act, 1934 (as amended in 2016). It has six members — three from the RBI and three external members appointed by the Central Government.",
    topic: "economy",
    difficulty: "hard",
    source_citation: "RBI Act, 1934",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  {
    id: "q7",
    content_item_id: "c3",
    prompt:
      "What is the inflation target mandated for the MPC under the amended RBI Act?",
    options: [
      { label: "A", text: "2% ± 1%" },
      { label: "B", text: "4% ± 2%" },
      { label: "C", text: "6% ± 2%" },
      { label: "D", text: "3% ± 1%" },
    ],
    correct_option: "B",
    explanation:
      "The MPC is mandated to maintain CPI inflation at 4% with an upper tolerance of 6% and lower tolerance of 2% (i.e., 4% ± 2%).",
    topic: "economy",
    difficulty: "medium",
    source_citation: "RBI",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  {
    id: "q8",
    content_item_id: "c3",
    prompt:
      "How many members does the Monetary Policy Committee have?",
    options: [
      { label: "A", text: "4" },
      { label: "B", text: "5" },
      { label: "C", text: "6" },
      { label: "D", text: "7" },
    ],
    correct_option: "C",
    explanation:
      "The MPC has 6 members: the RBI Governor (chairperson), a Deputy Governor, one RBI officer, and three external members appointed by the Central Government.",
    topic: "economy",
    difficulty: "easy",
    source_citation: "RBI",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  // Questions for c4 — NEP Amendments
  {
    id: "q9",
    content_item_id: "c4",
    prompt:
      "By which constitutional amendment was 'Education' moved from the State List to the Concurrent List?",
    options: [
      { label: "A", text: "42nd Amendment" },
      { label: "B", text: "44th Amendment" },
      { label: "C", text: "73rd Amendment" },
      { label: "D", text: "86th Amendment" },
    ],
    correct_option: "A",
    explanation:
      "The 42nd Constitutional Amendment (1976) transferred 'Education' from the State List to the Concurrent List, giving both Parliament and State Legislatures the power to legislate on education.",
    topic: "polity",
    difficulty: "medium",
    source_citation: "Constitution of India",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  {
    id: "q10",
    content_item_id: "c4",
    prompt:
      "Which body does the NEP amendment propose to replace the UGC?",
    options: [
      { label: "A", text: "National Testing Agency" },
      { label: "B", text: "National Higher Education Regulatory Council" },
      { label: "C", text: "Higher Education Commission of India" },
      { label: "D", text: "National Education Authority" },
    ],
    correct_option: "B",
    explanation:
      "The NEP amendments propose establishing the National Higher Education Regulatory Council (NHERC) as a single overarching regulatory body to replace the UGC, AICTE, and other domain-specific regulators.",
    topic: "polity",
    difficulty: "medium",
    source_citation: "PIB",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  // Questions for c5 — COP29
  {
    id: "q11",
    content_item_id: "c5",
    prompt:
      "What is the new annual climate finance target agreed upon at COP29?",
    options: [
      { label: "A", text: "$100 billion" },
      { label: "B", text: "$200 billion" },
      { label: "C", text: "$300 billion" },
      { label: "D", text: "$1 trillion" },
    ],
    correct_option: "C",
    explanation:
      "COP29 agreed on a new climate finance target of $300 billion annually by 2035, replacing the previous $100 billion target. Developing countries had demanded $1 trillion.",
    topic: "environment",
    difficulty: "easy",
    source_citation: "UNFCCC",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  {
    id: "q12",
    content_item_id: "c5",
    prompt:
      "Which article of the Paris Agreement deals with carbon trading mechanisms?",
    options: [
      { label: "A", text: "Article 2" },
      { label: "B", text: "Article 4" },
      { label: "C", text: "Article 6" },
      { label: "D", text: "Article 8" },
    ],
    correct_option: "C",
    explanation:
      "Article 6 of the Paris Agreement deals with voluntary cooperation and carbon trading mechanisms between countries, including international carbon credit markets.",
    topic: "environment",
    difficulty: "hard",
    source_citation: "Paris Agreement",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  // Additional mix of questions from other topics
  {
    id: "q13",
    content_item_id: "c6",
    prompt:
      "Under which Article of the Constitution can amendments be made that require ratification by state legislatures?",
    options: [
      { label: "A", text: "Article 352" },
      { label: "B", text: "Article 356" },
      { label: "C", text: "Article 368" },
      { label: "D", text: "Article 370" },
    ],
    correct_option: "C",
    explanation:
      "Article 368 provides the procedure for constitutional amendments. Certain amendments (affecting federal structure, judiciary, etc.) require ratification by at least half the state legislatures.",
    topic: "polity",
    difficulty: "medium",
    source_citation: "Constitution of India",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  {
    id: "q14",
    content_item_id: "c7",
    prompt:
      "SEBI was established under which Act?",
    options: [
      { label: "A", text: "Companies Act, 2013" },
      { label: "B", text: "Securities Contracts (Regulation) Act, 1956" },
      { label: "C", text: "SEBI Act, 1992" },
      { label: "D", text: "Banking Regulation Act, 1949" },
    ],
    correct_option: "C",
    explanation:
      "The Securities and Exchange Board of India was established as a statutory body under the SEBI Act, 1992, to regulate the securities market and protect investor interests.",
    topic: "legal",
    difficulty: "easy",
    source_citation: "SEBI Act, 1992",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  {
    id: "q15",
    content_item_id: "c9",
    prompt:
      "In which landmark case did the Supreme Court recognize the Right to Privacy as a fundamental right?",
    options: [
      { label: "A", text: "Maneka Gandhi v. Union of India" },
      { label: "B", text: "K.S. Puttaswamy v. Union of India" },
      { label: "C", text: "Vishaka v. State of Rajasthan" },
      { label: "D", text: "Navtej Singh Johar v. Union of India" },
    ],
    correct_option: "B",
    explanation:
      "In K.S. Puttaswamy v. Union of India (2017), a nine-judge bench of the Supreme Court unanimously held that the Right to Privacy is a fundamental right under Article 21.",
    topic: "legal",
    difficulty: "easy",
    source_citation: "Supreme Court of India",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  {
    id: "q16",
    content_item_id: "c10",
    prompt:
      "Which institution publishes the Global Economic Prospects report?",
    options: [
      { label: "A", text: "International Monetary Fund" },
      { label: "B", text: "World Trade Organization" },
      { label: "C", text: "World Bank" },
      { label: "D", text: "Asian Development Bank" },
    ],
    correct_option: "C",
    explanation:
      "The Global Economic Prospects report is published by the World Bank, providing analysis and forecasts for the global economy and individual countries.",
    topic: "economy",
    difficulty: "easy",
    source_citation: "World Bank",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  {
    id: "q17",
    content_item_id: "c11",
    prompt:
      "Which state has consistently topped the NITI Aayog SDG India Index?",
    options: [
      { label: "A", text: "Tamil Nadu" },
      { label: "B", text: "Karnataka" },
      { label: "C", text: "Kerala" },
      { label: "D", text: "Goa" },
    ],
    correct_option: "C",
    explanation:
      "Kerala has consistently topped the NITI Aayog SDG India Index, demonstrating strong performance across social development indicators including health, education, and gender equality.",
    topic: "reports",
    difficulty: "easy",
    source_citation: "NITI Aayog",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  {
    id: "q18",
    content_item_id: "c8",
    prompt:
      "What percentage of UK goods will have tariffs eliminated under the India-UK FTA?",
    options: [
      { label: "A", text: "50%" },
      { label: "B", text: "65%" },
      { label: "C", text: "85%" },
      { label: "D", text: "100%" },
    ],
    correct_option: "C",
    explanation:
      "The India-UK FTA eliminates tariffs on 85% of UK goods entering India over a 10-year period, making it one of India's most comprehensive trade agreements.",
    topic: "international",
    difficulty: "medium",
    source_citation: "Department of Commerce",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  {
    id: "q19",
    content_item_id: "c12",
    prompt:
      "Which is the highest civilian award in India?",
    options: [
      { label: "A", text: "Padma Shri" },
      { label: "B", text: "Padma Bhushan" },
      { label: "C", text: "Padma Vibhushan" },
      { label: "D", text: "Bharat Ratna" },
    ],
    correct_option: "D",
    explanation:
      "Bharat Ratna is the highest civilian award in India. The Padma awards rank as: Padma Vibhushan (second highest), Padma Bhushan (third), and Padma Shri (fourth).",
    topic: "awards",
    difficulty: "easy",
    source_citation: "Government of India",
    status: "approved",
    created_at: new Date().toISOString(),
  },
  {
    id: "q20",
    content_item_id: "c2",
    prompt:
      "Which country among the P5 has been the primary opponent of India's permanent UNSC membership bid?",
    options: [
      { label: "A", text: "United States" },
      { label: "B", text: "United Kingdom" },
      { label: "C", text: "France" },
      { label: "D", text: "China" },
    ],
    correct_option: "D",
    explanation:
      "China has been the primary opponent of India's permanent UNSC membership, partly due to strategic rivalry and its support for Pakistan's opposition to India's candidacy.",
    topic: "international",
    difficulty: "medium",
    source_citation: "MEA",
    status: "approved",
    created_at: new Date().toISOString(),
  },
];

// ============================================================
// DAILY ARCHIVE — spread mock items across the last 3 IST days so
// the date filters (Today / Yesterday / Older) are demonstrable.
// In production the pipeline stamps content_date (Asia/Kolkata)
// at generation and every day's content is stored permanently.
// ============================================================

import { istDaysAgo } from "@/lib/utils/date";

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// 5 today, 4 yesterday, 3 two days ago — with slot order within each day
const MOCK_DATE_SPREAD: Record<string, { day: number; slot: number }> = {
  c1: { day: 0, slot: 1 }, c2: { day: 0, slot: 2 }, c3: { day: 0, slot: 3 },
  c4: { day: 0, slot: 4 }, c5: { day: 0, slot: 5 },
  c6: { day: 1, slot: 1 }, c7: { day: 1, slot: 2 }, c8: { day: 1, slot: 3 }, c9: { day: 1, slot: 4 },
  c10: { day: 2, slot: 1 }, c11: { day: 2, slot: 2 }, c12: { day: 2, slot: 3 },
};

for (const item of MOCK_CONTENT) {
  const spread = MOCK_DATE_SPREAD[item.id] ?? { day: 0, slot: 0 };
  item.content_date = istDaysAgo(spread.day);
  item.daily_slot = spread.slot > 0 ? spread.slot : null;
  item.published_at = daysAgoIso(spread.day);
  item.created_at = daysAgoIso(spread.day);
  item.updated_at = daysAgoIso(spread.day);
}

// ============================================================
// MOCK TOPIC MASTERY
// ============================================================
export const MOCK_MASTERY: UserTopicMastery[] = [
  { id: "m1", user_id: "mock-user-001", topic: "polity", total_questions: 12, correct_count: 8, mastery_pct: 67, updated_at: new Date().toISOString() },
  { id: "m2", user_id: "mock-user-001", topic: "legal", total_questions: 15, correct_count: 11, mastery_pct: 73, updated_at: new Date().toISOString() },
  { id: "m3", user_id: "mock-user-001", topic: "international", total_questions: 10, correct_count: 6, mastery_pct: 60, updated_at: new Date().toISOString() },
  { id: "m4", user_id: "mock-user-001", topic: "economy", total_questions: 8, correct_count: 4, mastery_pct: 50, updated_at: new Date().toISOString() },
  { id: "m5", user_id: "mock-user-001", topic: "environment", total_questions: 5, correct_count: 3, mastery_pct: 60, updated_at: new Date().toISOString() },
  { id: "m6", user_id: "mock-user-001", topic: "awards", total_questions: 4, correct_count: 3, mastery_pct: 75, updated_at: new Date().toISOString() },
  { id: "m7", user_id: "mock-user-001", topic: "reports", total_questions: 3, correct_count: 2, mastery_pct: 67, updated_at: new Date().toISOString() },
];

// ============================================================
// HELPERS
// ============================================================

export function getQuestionsForContent(contentId: string): Question[] {
  return MOCK_QUESTIONS.filter((q) => q.content_item_id === contentId);
}

export function getQuestionsByTopic(topic: string, count: number = 12): Question[] {
  const topicQs = MOCK_QUESTIONS.filter((q) => q.topic === topic);
  return shuffleArray(topicQs).slice(0, count);
}

export function getDailyQuestions(count: number = 12): Question[] {
  return shuffleArray([...MOCK_QUESTIONS]).slice(0, count);
}

export function getContentBySlug(slug: string): ContentItem | undefined {
  return MOCK_CONTENT.find((c) => c.slug === slug);
}

export function getPublishedContent(): ContentItem[] {
  return MOCK_CONTENT.filter((c) => c.status === "published");
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
