import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { queryAll, queryOne } from '../db.js';

const router = express.Router();

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'gemini' | 'claude';
  description?: string;
  recommended?: boolean;
}

export const GEMINI_MODELS: ModelInfo[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'gemini',
    description: 'Fast, highly reliable & current recommended Flash model for engineering tasks',
    recommended: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'gemini',
    description: 'Lightweight ultra-fast model for quick summaries and low-latency queries',
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    provider: 'gemini',
    description: 'Auto-updating alias tracking latest Google Flash release',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    provider: 'gemini',
    description: 'Deep technical reasoning & document synthesis (Requires Paid API Key with Billing)',
  },
];

export const CLAUDE_MODELS: ModelInfo[] = [
  {
    id: 'claude-3-7-sonnet-latest',
    name: 'Claude 3.7 Sonnet',
    provider: 'claude',
    description: 'Leading-edge hybrid reasoning and coding architecture',
    recommended: true,
  },
  {
    id: 'claude-3-5-sonnet-latest',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    description: 'Exceptional precision for technical specs & procurement analysis',
  },
  {
    id: 'claude-3-5-haiku-latest',
    name: 'Claude 3.5 Haiku',
    provider: 'claude',
    description: 'Ultra-fast, cost-effective responses for quick status checks',
  },
  {
    id: 'claude-3-opus-latest',
    name: 'Claude 3 Opus',
    provider: 'claude',
    description: 'Comprehensive long-context narrative synthesis',
  },
];

// Helper to assemble full engineering workspace context for the AI
function buildWorkspaceContext() {
  try {
    const projects = queryAll<any>('SELECT id, name, code, client, description, status, start_date, end_date FROM projects');
    const packages = queryAll<any>('SELECT id, project_id, name, code, description, discipline, vendor, status FROM packages');
    const categories = queryAll<any>('SELECT id, name, description, color FROM categories');
    const tags = queryAll<any>('SELECT id, name, color FROM tags');
    const users = queryAll<any>('SELECT id, name, role, email, discipline FROM users');
    
    const tasks = queryAll<any>(`
      SELECT 
        t.id, 
        t.title, 
        t.description, 
        t.type, 
        t.priority, 
        t.status, 
        t.progress, 
        t.start_date, 
        t.deadline, 
        t.forecast_finish, 
        t.completed_date,
        p.code as project_code,
        p.name as project_name,
        pkg.code as package_code,
        pkg.name as package_name,
        c.name as category_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN packages pkg ON t.package_id = pkg.id
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.deadline ASC
    `);

    // Task tags mapping
    const taskTags = queryAll<any>(`
      SELECT tt.task_id, tg.name as tag_name 
      FROM task_tags tt
      JOIN tags tg ON tt.tag_id = tg.id
    `);
    const tagsByTaskId: Record<string, string[]> = {};
    taskTags.forEach((tt) => {
      if (!tagsByTaskId[tt.task_id]) tagsByTaskId[tt.task_id] = [];
      tagsByTaskId[tt.task_id].push(tt.tag_name);
    });

    // Task attachments count & names
    const attachments = queryAll<any>('SELECT task_id, original_name, file_size, mime_type FROM task_attachments');
    const attsByTaskId: Record<string, string[]> = {};
    attachments.forEach((att) => {
      if (!attsByTaskId[att.task_id]) attsByTaskId[att.task_id] = [];
      attsByTaskId[att.task_id].push(`${att.original_name} (${(att.file_size / 1024).toFixed(1)} KB)`);
    });

    // Recent comments
    const recentComments = queryAll<any>(`
      SELECT c.task_id, c.content, c.created_at, u.name as author_name
      FROM task_comments c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
      LIMIT 30
    `);
    const commentsByTaskId: Record<string, string[]> = {};
    recentComments.forEach((rc) => {
      if (!commentsByTaskId[rc.task_id]) commentsByTaskId[rc.task_id] = [];
      commentsByTaskId[rc.task_id].push(`[${rc.created_at.slice(0, 10)} by ${rc.author_name || 'Engineer'}]: ${rc.content}`);
    });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Compute high-level stats
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === 'DONE').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'IN PROGRESS').length;
    const overdueTasks = tasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED' && t.deadline && t.deadline < todayStr).length;
    const urgentTasks = tasks.filter((t) => t.priority === 'CRITICAL' || t.priority === 'HIGH').length;

    // Enriched task list
    const enrichedTasks = tasks.map((t) => {
      const isOverdue = t.status !== 'DONE' && t.status !== 'CANCELLED' && t.deadline && t.deadline < todayStr;
      const revCount = t.forecast_revision_count || 0;
      return {
        id: t.id,
        title: t.title,
        description: t.description || '',
        type: t.type,
        priority: t.priority,
        status: t.status,
        progress: `${t.progress}%`,
        project: t.project_code ? `${t.project_code} - ${t.project_name}` : 'General / No Project',
        package: t.package_code ? `${t.package_code} - ${t.package_name}` : 'General / Direct Project Task',
        category: t.category_name || 'Uncategorized',
        startDate: t.start_date || 'N/A',
        deadline: t.deadline || 'N/A',
        forecastFinish: t.forecast_finish || 'N/A',
        forecastRevisionCount: revCount,
        forecastWarning: revCount >= 2 ? `Forecast date revised ${revCount} times! Urgent expediting needed.` : undefined,
        completedDate: t.completed_date || 'N/A',
        isOverdue: isOverdue ? 'YES (OVERDUE)' : 'No',
        tags: tagsByTaskId[t.id] || [],
        attachments: attsByTaskId[t.id] || [],
        notes: commentsByTaskId[t.id] || [],
      };
    });

    return {
      currentDate: todayStr,
      summary: {
        totalTasks,
        doneTasks,
        inProgressTasks,
        overdueTasks,
        urgentTasks,
        totalProjects: projects.length,
        totalPackages: packages.length,
      },
      projects,
      packages,
      categories,
      tags,
      team: users,
      tasks: enrichedTasks,
    };
  } catch (err) {
    console.error('Error compiling workspace context:', err);
    return null;
  }
}

// Detect provider automatically from key or explicit provider
function detectProvider(provider?: string, apiKey?: string): 'gemini' | 'claude' {
  if (provider === 'claude' || provider === 'anthropic') return 'claude';
  if (provider === 'gemini' || provider === 'google') return 'gemini';
  if (apiKey?.trim().startsWith('sk-ant-')) return 'claude';
  return 'gemini';
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to resolve Gemini models
function resolveGeminiModel(modelName?: string): string {
  if (!modelName) return 'gemini-3.8-flash';
  const name = modelName.trim();
  if (name === 'gemini-3.8-flash') return 'gemini-3.8-flash';
  if (name.includes('pro')) return 'gemini-3.1-pro-preview';
  if (name.includes('lite')) return 'gemini-3.1-flash-lite';
  if (name === 'gemini-flash-latest') return 'gemini-flash-latest';
  if (
    name.includes('flash') ||
    name.includes('3.6') ||
    name.includes('3.7') ||
    name.includes('2.5') ||
    name.includes('2.0') ||
    name.includes('1.5')
  ) {
    return 'gemini-3.8-flash';
  }
  return name || 'gemini-3.8-flash';
}

// Helper to resolve Claude models
function resolveClaudeModel(modelName?: string): string {
  if (!modelName) return 'claude-3-7-sonnet-latest';
  const name = modelName.trim();
  if (name.includes('3-7') || name.includes('3.7')) return 'claude-3-7-sonnet-latest';
  if (name.includes('haiku')) return 'claude-3-5-haiku-latest';
  if (name.includes('opus')) return 'claude-3-opus-latest';
  if (name.includes('3-5') || name.includes('3.5') || name.includes('sonnet')) return 'claude-3-5-sonnet-latest';
  return name;
}

// Helper to resolve candidate Gemini models without mixing paid models into free tier
function getCandidateGeminiModels(targetModel: string): string[] {
  // If the user explicitly requested a Pro model (paid tier)
  if (targetModel.includes('pro')) {
    return ['gemini-3.1-pro-preview'];
  }

  // Free-tier text models:
  // 1. Target requested model (e.g. gemini-3.8-flash)
  // 2. High-availability, ultra-resilient fallback: gemini-3.1-flash-lite
  // 3. Auto-updating alias: gemini-flash-latest
  // 4. gemini-3.8-flash
  const candidates = [targetModel, 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  return Array.from(new Set(candidates)).filter((m) => !m.includes('pro'));
}

function cleanErrorMessage(err: any): string {
  if (!err) return 'Unknown error';
  const msg = err.message || String(err);
  let parsedMsg = msg;
  try {
    const jsonMatch = msg.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error?.message) {
        parsedMsg = parsed.error.message;
      } else if (parsed.message) {
        parsedMsg = parsed.message;
      }
    }
  } catch (e) {}

  if (parsedMsg.includes('limit: 0') || (parsedMsg.includes('Quota exceeded') && parsedMsg.includes('gemini-3.1-pro'))) {
    return 'Gemini 3.1 Pro requires a paid Google AI Studio account (free tier limit is 0). Please select Gemini 3.8 Flash or Gemini 3.1 Flash Lite.';
  }
  if (parsedMsg.includes('503') || parsedMsg.includes('high demand') || parsedMsg.includes('UNAVAILABLE')) {
    return 'Google Gemini is currently experiencing temporary high demand (HTTP 503). Spikes in demand are temporary. Please retry in a few moments, or select Gemini 3.1 Flash Lite.';
  }
  if (parsedMsg.includes('API_KEY_INVALID') || parsedMsg.includes('403') || parsedMsg.includes('unregistered') || parsedMsg.includes('API key not valid')) {
    return 'Invalid API Key. Please verify your Google Gemini API Key in Settings > AI Assistant.';
  }

  return parsedMsg;
}

// GET /api/ai/models - Return model choices by provider
router.get('/models', (req: Request, res: Response) => {
  const provider = (req.query.provider as string) || 'gemini';
  if (provider === 'claude' || provider === 'anthropic') {
    return res.json({ provider: 'claude', models: CLAUDE_MODELS });
  }
  return res.json({ provider: 'gemini', models: GEMINI_MODELS });
});

// AI Chat Endpoint
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const {
      message,
      history = [],
      customApiKey,
      provider: requestedProvider,
      model,
      customInstructions,
    } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const provider = detectProvider(requestedProvider, customApiKey);
    const apiKey = customApiKey?.trim() || (provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY);

    if (!apiKey) {
      return res.status(400).json({
        error: 'NO_API_KEY',
        message: `No ${provider === 'claude' ? 'Claude (Anthropic)' : 'Gemini (Google)'} API Key found. Please add your API Key in Settings > AI Assistant.`,
      });
    }

    const workspaceData = buildWorkspaceContext();

    const systemInstruction = `
You are the Senior AI Engineering Project Assistant embedded inside the "Engineering Work" Task Management System (PTSC EPC / Offshore & Industrial Engineering Workspace).

Current Date: ${workspaceData?.currentDate || new Date().toISOString().split('T')[0]}

CRITICAL PRESENTATION & COMMUNICATION RULES (STRICTLY REQUIRED):
1. NO CONVERSATIONAL FLUFF: Never start with generic polite greetings or conversational filler (such as "Hello!", "As your AI Assistant, I'm glad to help...", "Here is an in-depth analysis..."). Jump directly to the core answer or headline finding.
2. CONCISE & DIGESTIBLE: Keep answers crisp, focused, and easily scannable. Busy project engineers need immediate clarity, not massive walls of text. Limit answers to 2-5 concise bullet points or a compact Markdown table. Each bullet must be 1-2 sentences maximum.
3. HIGHLIGHT KEY INFORMATION:
   - Always bold critical metrics, dates, and priorities (e.g. **CRITICAL**, **Overdue by 5 days**, **Progress: 45%**, **Deadline: 25-Oct-2026**).
   - Use bold lead-in badges on bullets for instant scanning (e.g. "• **Immediate Action:** ...", "• **Critical Bottleneck:** ...", "• **Status Summary:** ...").
4. COMPACT TABLES: When comparing multiple tasks or packages, present them in a clean Markdown table with only vital columns (| Task | Priority | Status | Deadline | Variance |).
5. TASK LINKING & INTERACTION (MANDATORY):
   - Whenever referencing or listing ANY task, deliverable, or action item, you MUST ALWAYS format it as a clickable item:
     Format: [TASK:task-id|Task Title]
     Example: [TASK:tsk-abc12345|Review Flare System P&ID]
   - The UI automatically renders this as an interactive clickable link/button that opens the full task details modal directly for the engineer.
   - If a task has forecast revisions (forecastRevisionCount >= 2), explicitly point it out: e.g. "*(⚠️ Forecast Rev: #2 - Urgent expediting required)*".
6. PROFESSIONAL ENGLISH: Deliver all insights, analyses, and recommendations in clean, objective English.

${customInstructions ? `USER'S CUSTOM INSTRUCTIONS:\n${customInstructions}\n` : ''}

CURRENT LIVE WORKSPACE DATA:
\`\`\`json
${JSON.stringify(workspaceData, null, 2)}
\`\`\`
`;

    // Handle ANTHROPIC CLAUDE
    if (provider === 'claude') {
      const targetModel = resolveClaudeModel(model);
      const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      if (Array.isArray(history)) {
        for (const item of history) {
          const role = item.role === 'user' ? 'user' : 'assistant';
          let content = '';
          if (Array.isArray(item.parts)) {
            content = item.parts.map((p: any) => (typeof p === 'string' ? p : p.text || '')).join('\n');
          } else if (typeof item.content === 'string') {
            content = item.content;
          } else if (typeof item.text === 'string') {
            content = item.text;
          }
          if (content.trim()) {
            claudeMessages.push({ role, content: content.trim() });
          }
        }
      }

      // Add current message
      claudeMessages.push({ role: 'user', content: message.trim() });

      const candidateModels = Array.from(new Set([targetModel, 'claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest']));
      let responseText = '';
      let usedModel = targetModel;
      let lastError: any = null;

      for (const m of candidateModels) {
        try {
          const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: m,
              max_tokens: 4096,
              system: systemInstruction,
              messages: claudeMessages,
              temperature: 0.3,
            }),
          });

          const data = await anthropicRes.json();
          if (!anthropicRes.ok) {
            throw new Error(data.error?.message || data.message || `Anthropic API error: ${anthropicRes.statusText}`);
          }

          if (data.content && Array.isArray(data.content)) {
            responseText = data.content.map((c: any) => c.text || '').join('\n');
            usedModel = m;
            lastError = null;
            break;
          }
        } catch (err: any) {
          console.warn(`Claude model ${m} failed, trying next:`, err.message);
          lastError = err;
        }
      }

      if (lastError && !responseText) {
        throw lastError;
      }

      return res.json({
        reply: responseText || 'No response received from Claude.',
        modelUsed: usedModel,
        provider: 'claude',
        timestamp: new Date().toISOString(),
      });
    }

    // Handle GOOGLE GEMINI
    const targetModel = resolveGeminiModel(model);
    const candidateModels = getCandidateGeminiModels(targetModel);

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const formattedContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (Array.isArray(history)) {
      for (const item of history) {
        if (item.role && item.parts && Array.isArray(item.parts)) {
          formattedContents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: item.parts.map((p: any) => ({ text: typeof p === 'string' ? p : p.text || '' })),
          });
        }
      }
    }

    formattedContents.push({
      role: 'user',
      parts: [{ text: message.trim() }],
    });

    let responseText = '';
    let usedModel = targetModel;
    let lastError: any = null;

    for (const m of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.3,
          },
        });
        responseText = response.text || 'I could not generate a response. Please try again.';
        usedModel = m;
        lastError = null;
        break;
      } catch (err: any) {
        const errMsg = String(err?.message || err);
        const isTemporary503 = errMsg.includes('503') || errMsg.includes('demand') || errMsg.includes('UNAVAILABLE');
        if (isTemporary503) {
          console.info(`[AI Fallback] Model ${m} is temporarily experiencing high demand (503). Switching to fallback model...`);
        } else {
          console.info(`[AI Fallback] Model ${m} encountered an issue: ${errMsg.slice(0, 120)}. Trying backup model...`);
        }
        lastError = err;
      }
    }

    if (lastError && !responseText) {
      throw lastError;
    }

    return res.json({
      reply: responseText,
      modelUsed: usedModel,
      provider: 'gemini',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error generating AI response:', err);
    let errorMessage = cleanErrorMessage(err);
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('403') || errorMessage.includes('unregistered')) {
      errorMessage = 'Invalid API Key. Please check your API Key in Settings > AI Assistant.';
    }
    return res.status(500).json({
      error: errorMessage,
      message: errorMessage,
    });
  }
});

// Quick AI Test Endpoint & Model Auto-Discovery
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { customApiKey, provider: requestedProvider, model } = req.body;
    const provider = detectProvider(requestedProvider, customApiKey);
    const apiKey = customApiKey?.trim() || (provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY);

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: `No ${provider === 'claude' ? 'Claude' : 'Gemini'} API Key provided to test.`,
      });
    }

    // TEST ANTHROPIC CLAUDE
    if (provider === 'claude') {
      const targetModel = resolveClaudeModel(model);
      const candidateModels = Array.from(new Set([targetModel, 'claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest']));
      let verifiedModel = '';
      let lastError: any = null;

      for (const m of candidateModels) {
        try {
          const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: m,
              max_tokens: 15,
              messages: [{ role: 'user', content: 'Respond with exactly: "OK"' }],
            }),
          });

          const data = await anthropicRes.json();
          if (!anthropicRes.ok) {
            throw new Error(data.error?.message || data.message || `HTTP ${anthropicRes.status}`);
          }

          if (data.content && data.content.length > 0) {
            verifiedModel = m;
            lastError = null;
            break;
          }
        } catch (err: any) {
          console.warn(`Claude test with model ${m} failed:`, err.message);
          lastError = err;
        }
      }

      if (verifiedModel) {
        return res.json({
          success: true,
          provider: 'claude',
          verifiedModel,
          availableModels: CLAUDE_MODELS,
          message: `Anthropic Claude API Key connected successfully! Verified model: ${verifiedModel}`,
        });
      }

      throw lastError || new Error('Failed to verify Anthropic Claude API Key.');
    }

    // TEST GOOGLE GEMINI
    const targetModel = resolveGeminiModel(model);
    const candidateModels = getCandidateGeminiModels(targetModel);

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let verifiedModel = '';
    let lastError: any = null;

    for (const m of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: 'Respond with exactly: "OK_CONNECTION_VERIFIED"',
        });
        const text = response.text || '';
        if (text.length > 0) {
          verifiedModel = m;
          lastError = null;
          break;
        }
      } catch (err: any) {
        const errMsg = String(err?.message || err);
        const isTemporary503 = errMsg.includes('503') || errMsg.includes('demand') || errMsg.includes('UNAVAILABLE');
        if (isTemporary503) {
          console.info(`[AI Fallback] Model ${m} is temporarily experiencing high demand (503). Switching to fallback model...`);
        } else {
          console.info(`[AI Fallback] Model ${m} test issue: ${errMsg.slice(0, 120)}. Trying backup model...`);
        }
        lastError = err;
      }
    }

    if (verifiedModel) {
      const isFallback = verifiedModel !== targetModel;
      return res.json({
        success: true,
        provider: 'gemini',
        verifiedModel,
        availableModels: GEMINI_MODELS,
        message: isFallback
          ? `Google Gemini connected successfully! Active model: ${verifiedModel} (${targetModel} is currently experiencing temporary high demand).`
          : `Google Gemini API Key verified successfully! Model: ${verifiedModel}`,
      });
    }

    throw lastError || new Error('No compatible Gemini model responded successfully.');
  } catch (err: any) {
    console.error('AI test connection error:', err);
    const cleaned = cleanErrorMessage(err);
    return res.status(400).json({
      success: false,
      message: `Connection failed: ${cleaned}`,
    });
  }
});

// AI Reword Technical Description Endpoint (Oil & Gas EPCI Standard)
router.post('/reword-description', async (req: Request, res: Response) => {
  try {
    const {
      draftDescription,
      taskTitle,
      discipline,
      packageCode,
      customApiKey,
      provider: requestedProvider,
      model,
    } = req.body;

    const trimmedDraft = (draftDescription || '').trim();
    if (!trimmedDraft || trimmedDraft.length < 10 || trimmedDraft.split(/\s+/).length < 3) {
      return res.status(400).json({
        error: 'Draft description is too short or empty. Please enter draft technical notes or key points first (at least 3-4 words).',
      });
    }

    const provider = detectProvider(requestedProvider, customApiKey);
    const apiKey = customApiKey?.trim() || (provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY);

    if (!apiKey) {
      return res.status(400).json({
        error: 'NO_API_KEY',
        message: `No ${provider === 'claude' ? 'Claude' : 'Gemini'} API Key configured. Please add your API Key in Settings > AI Assistant.`,
      });
    }

    const rewordSystemInstruction = `You are a Senior Principal Discipline Engineer and Technical Lead in Offshore Oil & Gas and EPCI facilities (PetroVietnam / PTSC, TechnipFMC, McDermott, Saipem standards).
Your task is to reword, formalize, and elevate the user's draft technical description into an authoritative, professional, and technically rigorous Oil & Gas engineering description.

CORE GUIDELINES:
1. OIL & GAS DOMAIN PRECISION:
   - Use precise Oil & Gas EPCI industry terminology (e.g. ASME B31.3 / B31.4 / B31.8, API 6A / 6D / 598 / 650 / 610, AWS D1.1, DNV-OS-F101 / DNV-GL, NACE MR0175, P&ID, PFD, HAZOP / SIL, MTO, Datasheet, FAT / SAT / EFAT, Hydrotest, NDT RT/UT/MPI, QA/QC ITP, WPS/PQR, Punch List, Subsea / Topsides).
   - Maintain all equipment tag numbers, design pressures, temperatures, metallurgy/piping classes, and deliverable numbers mentioned in the draft.
2. ACTION-ORIENTED & STRUCTURED:
   - Start actions with clear engineering verbs (e.g., Perform, Verify, Conduct, Inspect, Issue, Coordinate, Fabricate, Calculate, Align, Expedite).
   - Use clean, structured sections or bullet points if the scope covers multiple deliverables (e.g., Scope of Work, Technical Requirements, Deliverables / Verification).
3. CLEAN DIRECT OUTPUT:
   - Output ONLY the reworded engineering technical description text directly.
   - Do NOT include markdown code fences (\`\`\`) enclosing the entire text.
   - Do NOT include conversational greetings (e.g., "Here is the reworded description:", "Sure, as an engineer...").
4. LANGUAGE: Deliver purely in professional English.`;

    const userPrompt = `TASK CONTEXT:
Task Title: ${taskTitle || 'Not specified'}
Discipline / Package: ${discipline || packageCode || 'Offshore Oil & Gas / EPCI'}

USER'S DRAFT TECHNICAL DESCRIPTION:
"""
${trimmedDraft}
"""

Please reword and elevate the draft description above into a rigorous, professional Oil & Gas engineering Technical Description / Scope of Work.`;

    // Handle CLAUDE
    if (provider === 'claude') {
      const targetModel = resolveClaudeModel(model);
      const candidateModels = Array.from(new Set([targetModel, 'claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest']));
      let responseText = '';
      let usedModel = targetModel;
      let lastError: any = null;

      for (const m of candidateModels) {
        try {
          const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: m,
              max_tokens: 2048,
              system: rewordSystemInstruction,
              messages: [{ role: 'user', content: userPrompt }],
              temperature: 0.25,
            }),
          });

          const data = await anthropicRes.json();
          if (!anthropicRes.ok) {
            throw new Error(data.error?.message || data.message || `Anthropic API error: ${anthropicRes.statusText}`);
          }

          if (data.content && Array.isArray(data.content)) {
            responseText = data.content.map((c: any) => c.text || '').join('\n').trim();
            usedModel = m;
            lastError = null;
            break;
          }
        } catch (err: any) {
          console.warn(`Claude model ${m} failed for reword:`, err.message);
          lastError = err;
        }
      }

      if (lastError && !responseText) throw lastError;

      return res.json({
        rewordedDescription: responseText,
        modelUsed: usedModel,
        provider: 'claude',
      });
    }

    // Handle GEMINI
    const targetModel = resolveGeminiModel(model);
    const candidateModels = getCandidateGeminiModels(targetModel);

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let responseText = '';
    let usedModel = targetModel;
    let lastError: any = null;

    for (const m of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction: rewordSystemInstruction,
            temperature: 0.25,
          },
        });
        const text = response.text || '';
        if (text.trim().length > 0) {
          responseText = text.trim();
          usedModel = m;
          lastError = null;
          break;
        }
      } catch (err: any) {
        const errMsg = String(err?.message || err);
        const isTemporary503 = errMsg.includes('503') || errMsg.includes('demand') || errMsg.includes('UNAVAILABLE');
        if (isTemporary503) {
          console.info(`[AI Fallback] Model ${m} is temporarily experiencing high demand (503). Switching to fallback model...`);
        } else {
          console.info(`[AI Fallback] Model ${m} reword issue: ${errMsg.slice(0, 120)}. Trying backup model...`);
        }
        lastError = err;
      }
    }

    if (lastError && !responseText) throw lastError;

    // Clean any accidental markdown backticks wrapping the whole response
    let cleaned = responseText;
    if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
      cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    return res.json({
      rewordedDescription: cleaned,
      modelUsed: usedModel,
      provider: 'gemini',
    });
  } catch (err: any) {
    console.error('Error rewording description with AI:', err);
    const cleaned = cleanErrorMessage(err);
    return res.status(500).json({
      error: cleaned,
      message: cleaned,
    });
  }
});

export default router;
