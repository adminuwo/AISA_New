import re

with open('src/Tools/AI_Legal/components/LegalChatScreen.jsx', 'r') as f:
    content = f.read()

old_func_start = """  const handleNewChat = async () => {
    // Generate a fresh chat ID and set as active
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    chatIdRef.current = newId;
    setActiveSessionId(newId);

    // Clear any attachments from previous chat
    setAttachments([]);

    // Initialize new chat with welcome AI message
    const newMsgs = [{
      id: '1',
      text: `Hello! I am your AI ${toolName}. ${toolDesc} How can I assist you today?`,
      sender: 'ai',
      timestamp: new Date(),
      isIntro: true,
    }];
    setMessages(newMsgs);

    // Persist the newly created empty session in history
    const newSessionItem = {
      chat_id: newId,
      title: 'New Chat',
      timestamp: Date.now(),
    };
    setSessions(prev => [newSessionItem, ...prev]);

    const dbMsg = mapLocalMessageToDb(newMsgs[0]);
    dbMsg.activeTool = 'General Legal Chat';
    dbMsg.mode = 'NORMAL_CHAT';
    try {
      await chatStorageService.saveMessage(newId, dbMsg, 'New Chat', currentCase?._id);
    } catch (e) {
      console.error("Failed to save initial message in new chat", e);
    }

    // Scroll to top of chat window
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Focus input after a short delay
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  };"""

new_func = """  const handleNewChat = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    chatIdRef.current = newId;
    setActiveSessionId(newId);
    setAttachments([]);
    setInputValue('');

    if (currentCase) {
      const promptText = `Provide a comprehensive legal analysis and strategy advice for the following case:
- **Case ID**: ${currentCase.id || currentCase._id}
- **Case Name**: ${currentCase.title || currentCase.name || 'N/A'}
- **Case Number**: ${currentCase.caseNumber || 'N/A'}
- **Case Type**: ${currentCase.caseType || currentCase.category || 'N/A'}
- **Court**: ${currentCase.courtName || currentCase.courtType || 'N/A'}
- **Client Details**: ${currentCase.clientName || 'N/A'}
- **Opponent Details**: ${currentCase.opponentName || 'N/A'}
- **Case Status**: ${currentCase.status || 'N/A'}
- **Case Description**: ${currentCase.summary || currentCase.description || 'N/A'}
- **Uploaded Documents**: ${(currentCase.documents || []).length} files
- **Evidence**: ${(currentCase.evidence || []).length} items
- **Notes**: ${currentCase.notes || 'N/A'}
- **Timeline**: ${(currentCase.timeline || []).length} events
- **Previous AI Legal conversations**: ${currentCase.savedResponses ? currentCase.savedResponses.length : 0}

Please provide:
- Case Summary
- Legal Issues
- Applicable Laws
- Strengths of the Case
- Weaknesses of the Case
- Missing Evidence
- Missing Documents
- Recommended Legal Strategy
- Possible Defences
- Relevant Legal Precedents
- Draft Suggestions
- Risks
- Next Legal Steps
- Probability Assessment
- Recommended Actions`;

      const userMsg = {
        id: Date.now().toString(),
        text: promptText,
        sender: 'user',
        timestamp: new Date(),
        isIntro: false,
      };

      setMessages([userMsg]);
      setIsTyping(true);

      const newSessionItem = {
        chat_id: newId,
        title: 'Case Analysis',
        timestamp: Date.now(),
      };
      setSessions(prev => [newSessionItem, ...prev]);

      const dbMsg = mapLocalMessageToDb(userMsg);
      dbMsg.activeTool = 'General Legal Chat';
      dbMsg.mode = 'NORMAL_CHAT';
      try {
        await chatStorageService.saveMessage(newId, dbMsg, 'Case Analysis', currentCase?._id);
      } catch (err) {
        console.error("Failed to save initial user message", err);
      }

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);

      try {
        const response = await generateChatResponse(
          [], 
          promptText,
          LEGAL_SYSTEM_INSTRUCTION,
          [],
          'English',
          null, null, null, null
        );

        let responseText = '';
        if (typeof response === 'string') responseText = response;
        else if (response?.reply) responseText = response.reply;
        else if (response?.data?.reply) responseText = response.data.reply;
        else if (response?.text) responseText = response.text;
        else if (response && typeof response === 'object') responseText = JSON.stringify(response);
        if (!responseText) responseText = 'We could not process the response. Please try again.';

        const aiMsg = {
          id: (Date.now() + 1).toString(),
          text: responseText,
          sender: 'ai',
          timestamp: new Date(),
          isIntro: false,
        };

        setMessages(prev => {
          const updated = [...prev, aiMsg];
          saveChatHistory(updated);
          return updated;
        });
      } catch (err) {
        console.error('[LegalChatScreen] API Error:', err);
        const errorMsg = {
          id: (Date.now() + 1).toString(),
          text: err?.message || 'Unable to connect. Please check your connection and try again.',
          sender: 'ai',
          timestamp: new Date(),
          isIntro: false,
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }

    } else {
      const newMsgs = [{
        id: '1',
        text: `Hello! I am your AI ${toolName}. ${toolDesc} How can I assist you today?`,
        sender: 'ai',
        timestamp: new Date(),
        isIntro: true,
      }];
      setMessages(newMsgs);

      const newSessionItem = {
        chat_id: newId,
        title: 'New Chat',
        timestamp: Date.now(),
      };
      setSessions(prev => [newSessionItem, ...prev]);

      const dbMsg = mapLocalMessageToDb(newMsgs[0]);
      dbMsg.activeTool = 'General Legal Chat';
      dbMsg.mode = 'NORMAL_CHAT';
      try {
        await chatStorageService.saveMessage(newId, dbMsg, 'New Chat', currentCase?._id);
      } catch (e) {
        console.error("Failed to save initial message in new chat", e);
      }
      
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  };"""

if old_func_start in content:
    content = content.replace(old_func_start, new_func)
    with open('src/Tools/AI_Legal/components/LegalChatScreen.jsx', 'w') as f:
        f.write(content)
    print("Successfully replaced handleNewChat")
else:
    print("Could not find exact old function signature")
