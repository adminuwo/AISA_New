import sys
import os

path = r'c:\Users\USER\Desktop\AISA_08\Aisa_beta\src\pages\Chat.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Update initChat in Chat.jsx to handle legal routes and views correctly
# We look for the part where it handles !sessionId (the 'else' block)

old_init_else = """          if (!currentProjectId || currentProjectId === 'default' || currentProjectId === 'all') {
            setCurrentCase(null);
            if (currentMode !== 'LEGAL_TOOLKIT') {
              setCurrentMode('NORMAL_CHAT');
              setSelectedLegalTool(null);
            }
          }"""

new_init_else = """          if (!currentProjectId || currentProjectId === 'default' || currentProjectId === 'all') {
            setCurrentCase(null);
            // Handle Direct Dashboard Navigation
            if (location.pathname === '/dashboard/cases') {
              const params = new URLSearchParams(location.search);
              const toolParam = params.get('tool');
              const view = toolParam === 'legal_precedents' ? 'PRECEDENTS' : 'DASHBOARD';
              setLegalView(view);
              setCurrentMode('LEGAL_TOOLKIT');
              const toolId = toolParam === 'legal_precedents' ? 'legal_precedents' : 'legal_my_case';
              const toolName = toolParam === 'legal_precedents' ? 'Legal Precedents' : 'My Case Assistant';
              setSelectedLegalTool({ id: toolId, name: toolName });
              localStorage.setItem('aisa_legal_view', view);
              localStorage.setItem('aisa_active_mode', 'LEGAL_TOOLKIT');
            } else if (currentMode !== 'LEGAL_TOOLKIT') {
              setCurrentMode('NORMAL_CHAT');
              setSelectedLegalTool(null);
            }
          }"""

if old_init_else in content:
    content = content.replace(old_init_else, new_init_else)
    print("initChat logic updated")
else:
    print("initChat logic NOT found")

# Fix 2: Simplify rendering conditions to prevent white screen
# We'll make the PRECEDENTS and DASHBOARD views more resilient

old_prec_cond = "legalView === 'PRECEDENTS' && currentMode === 'LEGAL_TOOLKIT'"
new_prec_cond = "(legalView === 'PRECEDENTS' || location.search.includes('tool=legal_precedents')) && currentMode === 'LEGAL_TOOLKIT'"

if old_prec_cond in content:
    content = content.replace(old_prec_cond, new_prec_cond)
    print("PRECEDENTS condition updated")

old_dash_cond = "(legalView === 'DASHBOARD' || (!currentCase && location.pathname === '/dashboard/cases')) && currentMode === 'LEGAL_TOOLKIT' && selectedLegalTool?.id === 'legal_my_case'"
new_dash_cond = "(legalView === 'DASHBOARD' || location.pathname === '/dashboard/cases') && currentMode === 'LEGAL_TOOLKIT' && (selectedLegalTool?.id === 'legal_my_case' || !location.search.includes('tool=legal_precedents'))"

if old_dash_cond in content:
    content = content.replace(old_dash_cond, new_dash_cond)
    print("DASHBOARD condition updated")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
