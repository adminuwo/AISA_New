const fs = require('fs');
const path = 'c:/Users/USER/Desktop/AISA_06/Aisa_beta/src/pages/Chat.jsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Find the line where loadSessions starts
let loadSessionsStart = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const loadSessions = async () => {')) {
        loadSessionsStart = i;
        break;
    }
}

// Find the line after the messy part where chatContainerRef starts
let chatContainerRefStart = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const chatContainerRef = useRef(null);')) {
        chatContainerRefStart = i;
        break;
    }
}

if (loadSessionsStart === -1 || chatContainerRefStart === -1) {
    console.error("Could not find boundaries", { loadSessionsStart, chatContainerRefStart });
    process.exit(1);
}

const beforePart = lines.slice(0, loadSessionsStart).join('\n');
const afterPart = lines.slice(chatContainerRefStart).join('\n');

const middlePart = `    const loadSessions = async () => {
      const data = await chatStorageService.getSessions(currentProjectId);
      setSessions(data);

      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const userId = user?.id || user?._id;
        if (userId) {
          const token = getUserData()?.token || localStorage.getItem("token");
          const res = await axios.post(apis.getUserAgents, { userId }, {
            headers: { 'Authorization': \`Bearer \${token}\` }
          });
          const agents = res.data?.agents || [];
          const processedAgents = [{ agentName: 'AI Ads', category: 'General', avatar: '/AGENTS_IMG/AI Ads_BRAIN_LOGO.png' }, ...agents];
          setUserAgents(processedAgents);
        } else {
          setUserAgents([{ agentName: 'AI Ads', category: 'General', avatar: '/AGENTS_IMG/AI Ads_BRAIN_LOGO.png' }]);
        }
      } catch (err) {
        setUserAgents([{ agentName: 'AI Ads', category: 'General', avatar: '/AGENTS_IMG/AI Ads_BRAIN_LOGO.png' }]);
      }
    };
    loadSessions();
  }, [messages, setSessions, currentProjectId]);

  const isNavigatingRef = useRef(false);
  const lastLoadedSessionRef = useRef(null);

  useEffect(() => {
    const initChat = async () => {
      if (isNavigatingRef.current) {
        isNavigatingRef.current = false;
        setIsHydrating(false);
        return;
      }

      const currentSession = sessionId;
      
      if (currentSession && currentSession !== 'new' && lastLoadedSessionRef.current === currentSession && messages.length > 0) {
        setIsHydrating(false);
        setIsSessionLoading(false);
        return;
      }

      setIsSessionLoading(true);
      
      try {
        if (sessionId && sessionId !== 'new') {
          if (lastLoadedSessionRef.current && lastLoadedSessionRef.current !== sessionId) {
            setMessages([]); 
          }
          
          const sessionData = await chatStorageService.getHistory(sessionId);
          if (currentSession !== sessionId) return;

          const historyMessages = Array.isArray(sessionData) ? sessionData : (sessionData.messages || []);
          const sessionMeta = Array.isArray(sessionData) ? {} : sessionData;

          if (sessionMeta.projectId && sessionMeta.projectId !== currentProjectId) {
            setCurrentProjectId(sessionMeta.projectId);
          }

          if (sessionMeta.detectedMode === 'LEGAL_TOOLKIT' || (sessionMeta.projectId && currentCase?.isLegalCase)) {
            if (currentMode !== 'LEGAL_TOOLKIT') {
              setCurrentMode('LEGAL_TOOLKIT');
            }
          }

          const processedHistory = historyMessages.map(msg => {
            if (!msg.id) msg.id = (msg._id || Math.random().toString(36).substr(2, 9)).toString();
            if (msg.conversion && msg.conversion.file && !msg.conversion.blobUrl) {
              try {
                const byteCharacters = atob(msg.conversion.file);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: msg.conversion.mimeType });
                msg.conversion.blobUrl = URL.createObjectURL(blob);
              } catch (e) { console.error("Blob recovery failed:", e); }
            }
            return msg;
          });

          if (processedHistory.length > 0 || lastLoadedSessionRef.current !== sessionId) {
            setMessages(processedHistory);
          }
          
          lastLoadedSessionRef.current = sessionId;

          const params = new URLSearchParams(location.search);
          const toolParam = params.get('tool');
          if (toolParam?.startsWith('legal_')) {
            const legalTool = PREMIUM_TOOLS.find(t => t.id === toolParam);
            activateToolWithTypingEffect(toolParam, legalTool?.name, false); 
          }
        } else {
          setCurrentSessionId('new');
          lastLoadedSessionRef.current = 'new';
          setMessages([]); 
          
          if (!currentProjectId || currentProjectId === 'default' || currentProjectId === 'all') {
            setCurrentCase(null);
            if (currentMode !== 'LEGAL_TOOLKIT') {
              setCurrentMode('NORMAL_CHAT');
              setSelectedLegalTool(null);
            }
          } else if (currentCase?.isLegalCase) {
            setCurrentMode('LEGAL_TOOLKIT');
            setSelectedLegalTool({ id: 'legal_my_case', name: 'My Case Assistant' });
          }

          const user = getUserData();
          if (user && user.token) {
            try {
              const res = await axios.get(\`\${apis.baseUrl}/api/memory\`, {
                headers: { Authorization: \`Bearer \${user.token}\` }
              });
              const mem = res.data;
              setMemoryRecoil(mem);
              if (mem && mem.isMemoryEnabled) {
                const name = mem.name || user.name || "friend";
                const business = mem.businessType;
                if (!mem.name && !mem.businessType && sessionId === 'new') setShowOnboarding(true);

                let greeting = \`Hello \${name}! 👋 Welcome back. \`;
                if (business) greeting += \`How is everything going with your \${business} work? \`;
                greeting += "I've loaded your context and I'm ready to assist. What can we achieve today?";

                setMessages([{
                  id: 'welcome-' + Date.now(),
                  role: 'model',
                  content: greeting,
                  timestamp: new Date()
                }]);
              }
            } catch (e) { console.warn("Memory load failed", e); }
          }
        }
      } catch (err) {
        console.error("Chat initialization failed:", err);
      } finally {
        setIsHydrating(false);
        setIsSessionLoading(false);
        setShowHistory(false);
      }
    };
    initChat();
  }, [sessionId, location.key, currentProjectId]);

  `;

fs.writeFileSync(path, beforePart + middlePart + afterPart);
console.log("File successfully repaired!");
