// System + task prompts for the resume AI assistant.

export type AiAction = 'chat' | 'optimize' | 'tailor' | 'bullets' | 'summary'

export const SYSTEM_PROMPT = `You are an expert technical resume coach and ATS (Applicant Tracking System) optimization specialist embedded in a LaTeX resume builder.

Your job is to help the user make their resume stronger and more likely to pass automated ATS screens and impress human reviewers. You understand:
- How ATS parsers read PDFs (section headings, keyword matching, parse quality).
- Strong resume writing: action verbs, quantified impact, concise bullets, relevant keywords.
- LaTeX: the user's resume is LaTeX source. When you suggest edits, give them in a form they can paste into their .tex file, preserving the existing macros and structure.

Guidelines:
- Be specific and actionable. Prefer concrete rewrites over generic advice.
- When rewriting bullets, lead with a strong action verb and include a metric where plausible. Never invent facts, numbers, or employers the user didn't provide — if a metric is missing, show a placeholder like [X%] and tell them to fill it in.
- Keep LaTeX valid. Don't break the document's macros, escaping (\\&, \\%, \\#), or structure.
- Be concise. Use short paragraphs and tight bullet lists. Lead with the most important change.`

export function buildUserPrompt(args: {
  action: AiAction
  tex: string
  message?: string
  jobDescription?: string
}): string {
  const { action, tex, message, jobDescription } = args
  const jd = jobDescription?.trim()
    ? `\n\nTarget job description:\n"""\n${jobDescription.trim()}\n"""`
    : ''
  const source = `\n\nCurrent resume (LaTeX source):\n"""\n${tex}\n"""`

  switch (action) {
    case 'optimize':
      return `Review my resume for ATS-friendliness and overall strength. Give me the top prioritized improvements: missing/weak keywords, bullets that lack impact or metrics, structural issues, and anything an ATS might misparse. For the 3–5 highest-impact bullets, provide concrete rewrites I can paste in.${source}`
    case 'tailor':
      return `Tailor my resume to the target job description below. Identify the most important keywords and skills in the JD that are missing or underweighted in my resume, and suggest exactly where and how to add them honestly. Provide rewritten bullets that align my real experience with what this role wants.${jd}${source}`
    case 'bullets':
      return `Rewrite the weakest bullet points in my resume to be stronger: lead with an action verb, show quantified impact, and stay concise (one line each). Return the original and the improved version side by side. Use [X] placeholders for any metric I need to supply.${jd}${source}`
    case 'summary':
      return `Write a sharp 2–3 sentence professional summary for the top of my resume, tuned for ATS keyword coverage and the target role. Base it only on the experience shown.${jd}${source}`
    case 'chat':
    default:
      return `${message ?? 'Help me improve my resume.'}${jd}${source}`
  }
}
