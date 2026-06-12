// Curated skills/keyword dictionary for keyword density + JD matching.
// Each canonical term maps to a list of aliases (lowercased). Seeded from the
// resume Skills sidebars so it is already domain-tuned for SWE / AI roles.

export interface SkillEntry {
  canonical: string
  aliases: string[]
}

export const SKILLS_DICTIONARY: SkillEntry[] = [
  // Languages
  { canonical: 'JavaScript', aliases: ['javascript', 'js'] },
  { canonical: 'TypeScript', aliases: ['typescript', 'ts'] },
  { canonical: 'Python', aliases: ['python', 'py'] },
  { canonical: 'Java', aliases: ['java'] },
  { canonical: 'Go', aliases: ['golang', 'go'] },
  { canonical: 'Rust', aliases: ['rust'] },
  { canonical: 'C++', aliases: ['c++', 'cpp'] },
  { canonical: 'C#', aliases: ['c#', 'csharp'] },
  { canonical: 'Ruby', aliases: ['ruby'] },
  { canonical: 'PHP', aliases: ['php'] },
  { canonical: 'Swift', aliases: ['swift'] },
  { canonical: 'Kotlin', aliases: ['kotlin'] },
  { canonical: 'SQL', aliases: ['sql'] },
  { canonical: 'Scala', aliases: ['scala'] },

  // Frontend
  { canonical: 'React', aliases: ['react', 'react.js', 'reactjs'] },
  { canonical: 'Next.js', aliases: ['next.js', 'nextjs', 'next js'] },
  { canonical: 'Vue', aliases: ['vue', 'vue.js', 'vuejs'] },
  { canonical: 'Angular', aliases: ['angular', 'angular.js', 'angularjs'] },
  { canonical: 'Svelte', aliases: ['svelte', 'sveltekit'] },
  { canonical: 'Redux', aliases: ['redux'] },
  { canonical: 'Tailwind CSS', aliases: ['tailwind', 'tailwindcss', 'tailwind css'] },
  { canonical: 'HTML', aliases: ['html', 'html5'] },
  { canonical: 'CSS', aliases: ['css', 'css3'] },
  { canonical: 'GraphQL', aliases: ['graphql'] },

  // Backend
  { canonical: 'Node.js', aliases: ['node.js', 'nodejs', 'node'] },
  { canonical: 'Express', aliases: ['express', 'express.js', 'expressjs'] },
  { canonical: 'NestJS', aliases: ['nestjs', 'nest.js'] },
  { canonical: 'Django', aliases: ['django'] },
  { canonical: 'Flask', aliases: ['flask'] },
  { canonical: 'FastAPI', aliases: ['fastapi'] },
  { canonical: 'Spring', aliases: ['spring', 'spring boot', 'springboot'] },
  { canonical: 'REST', aliases: ['rest', 'restful', 'rest api'] },
  { canonical: 'gRPC', aliases: ['grpc'] },
  { canonical: 'Microservices', aliases: ['microservices', 'microservice'] },

  // Data / DB
  { canonical: 'PostgreSQL', aliases: ['postgresql', 'postgres'] },
  { canonical: 'MySQL', aliases: ['mysql'] },
  { canonical: 'MongoDB', aliases: ['mongodb', 'mongo'] },
  { canonical: 'Redis', aliases: ['redis'] },
  { canonical: 'Elasticsearch', aliases: ['elasticsearch', 'elastic search'] },
  { canonical: 'Kafka', aliases: ['kafka', 'apache kafka'] },
  { canonical: 'DynamoDB', aliases: ['dynamodb'] },

  // Cloud / DevOps
  { canonical: 'AWS', aliases: ['aws', 'amazon web services'] },
  { canonical: 'GCP', aliases: ['gcp', 'google cloud', 'google cloud platform'] },
  { canonical: 'Azure', aliases: ['azure', 'microsoft azure'] },
  { canonical: 'Docker', aliases: ['docker'] },
  { canonical: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { canonical: 'Terraform', aliases: ['terraform'] },
  { canonical: 'OpenShift', aliases: ['openshift'] },
  { canonical: 'CI/CD', aliases: ['ci/cd', 'cicd', 'ci cd', 'continuous integration', 'continuous delivery'] },
  { canonical: 'Jenkins', aliases: ['jenkins'] },
  { canonical: 'GitHub Actions', aliases: ['github actions'] },
  { canonical: 'Git', aliases: ['git'] },

  // AI / ML
  { canonical: 'Machine Learning', aliases: ['machine learning', 'ml'] },
  { canonical: 'Deep Learning', aliases: ['deep learning'] },
  { canonical: 'PyTorch', aliases: ['pytorch'] },
  { canonical: 'TensorFlow', aliases: ['tensorflow'] },
  { canonical: 'LangChain', aliases: ['langchain'] },
  { canonical: 'LangGraph', aliases: ['langgraph', 'stategraph'] },
  { canonical: 'LLM', aliases: ['llm', 'llms', 'large language model', 'large language models'] },
  { canonical: 'RAG', aliases: ['rag', 'retrieval-augmented generation', 'retrieval augmented generation'] },
  { canonical: 'OpenAI', aliases: ['openai', 'gpt-4', 'gpt-4o', 'gpt'] },
  { canonical: 'Anthropic', aliases: ['anthropic', 'claude'] },
  { canonical: 'Vector Database', aliases: ['vector database', 'vector db', 'pinecone', 'weaviate', 'pgvector'] },
  { canonical: 'NLP', aliases: ['nlp', 'natural language processing'] },
  { canonical: 'Hugging Face', aliases: ['hugging face', 'huggingface'] },

  // Practices
  { canonical: 'Agile', aliases: ['agile', 'scrum'] },
  { canonical: 'TDD', aliases: ['tdd', 'test-driven development', 'test driven development'] },
  { canonical: 'System Design', aliases: ['system design'] },
  { canonical: 'Distributed Systems', aliases: ['distributed systems', 'distributed system'] },
]

// Brand names that look like glued camelCase words but are legitimate.
export const BRAND_ALLOWLIST = new Set(
  [
    'StateGraph',
    'GitHub',
    'GitLab',
    'LangChain',
    'LangGraph',
    'OpenShift',
    'OpenAI',
    'PostgreSQL',
    'MongoDB',
    'DynamoDB',
    'GraphQL',
    'JavaScript',
    'TypeScript',
    'NestJS',
    'FastAPI',
    'PyTorch',
    'TensorFlow',
    'Kubernetes',
    'DevOps',
    'MLOps',
    'GoLang',
    'NodeJS',
    'WebSocket',
    'WebSockets',
    'iOS',
    'macOS',
    'jQuery',
    'YAML',
    'JSON',
  ].map((s) => s.toLowerCase())
)

// Build an alias -> canonical lookup once.
let aliasIndex: Map<string, string> | null = null
export function getAliasIndex(): Map<string, string> {
  if (aliasIndex) return aliasIndex
  const index = new Map<string, string>()
  for (const entry of SKILLS_DICTIONARY) {
    index.set(entry.canonical.toLowerCase(), entry.canonical)
    for (const alias of entry.aliases) index.set(alias, entry.canonical)
  }
  aliasIndex = index
  return index
}
