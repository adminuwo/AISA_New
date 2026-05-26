import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatStorageService } from '../services/chatStorageService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus as highlighterTheme } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Globe, MessageCircle, Bot, User, Sparkles, ExternalLink, Calendar, Rocket, ChevronDown, 
  X, Download, FileSpreadsheet, Presentation, FileText, File as FileIcon 
} from 'lucide-react';
import Loader from '../Components/Loader/Loader';
import { getModeIcon, getModeName, MODES } from '../utils/modeDetection';
import toast from 'react-hot-toast';
import { useRecoilValue } from 'recoil';
import { userData } from '../userStore/userData';

// Lazy load video player to optimize initial bundle size
const CustomVideoPlayer = React.lazy(() => import('../Tools/AI_Video_Generator/CustomVideoPlayer').catch(() => ({ default: () => null })));

const SharedChat = () => {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMessages, setExpandedMessages] = useState({});
  const [viewingDoc, setViewingDoc] = useState(null);

  useEffect(() => {
    const fetchSharedChat = async () => {
      try {
        setLoading(true);
        const data = await chatStorageService.getSharedSession(shareId);
        setSession(data);
      } catch (err) {
        console.error("Shared chat fetch error:", err);
        setError("This shared chat link is invalid or has been removed.");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedChat();
  }, [shareId]);

  const userStore = useRecoilValue(userData);
  const currentUser = userStore?.user;

  const handleDuplicate = async () => {
    try {
      const shareToast = toast.loading("Duplicating conversation...");
      const response = await chatStorageService.duplicateSharedSession(shareId, currentUser?.id);
      if (response.success) {
        toast.success("Conversation copied! Redirecting...", { id: shareToast });
        navigate(`/dashboard/chat/${response.sessionId}`);
      } else {
        throw new Error("Failed to duplicate");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy conversation. Please log in first.");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]"><Loader /></div>;

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4 text-center bg-white dark:bg-[#0a0a0a]">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Oops!</h1>
        <p className="text-subtext mb-6">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                {session?.title || "Shared Conversation"}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Shared via AISA™</span>
                <span className="text-[10px] text-zinc-400">•</span>
                <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
                  <Calendar size={10} />
                  {new Date(session?.lastModified).toLocaleDateString()}
                </span>
                <span className="ml-2 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold rounded-md border border-zinc-200 dark:border-zinc-700">
                  Read Only
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDuplicate}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <MessageCircle size={14} />
              <span>Continue this Chat</span>
            </button>
            <button 
              onClick={() => navigate('/')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
              <Rocket size={14} />
              <span>Try AISA</span>
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 max-w-4xl mx-auto w-full pt-24 pb-32 px-4">
        <div className="space-y-12">
          {session?.messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col gap-4 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              
              {/* Avatar & Label */}
              <div className={`flex items-center gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-md ${
                  msg.role === 'user' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' : 'bg-primary/20 text-primary'
                }`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-subtext">
                  {msg.role === 'user' ? 'You' : 'AISA AI'}
                </span>
              </div>

              {/* Message Content */}
              <div className={`w-full max-w-[90%] p-5 rounded-2xl border transition-all ${
                msg.role === 'user' 
                  ? 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200/50 dark:border-zinc-800/50' 
                  : 'bg-white dark:bg-[#0f0f0f] border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/5 dark:shadow-none'
              }`}>
                {/* Mode Indicator for Model */}
                {msg.role === 'model' && (msg.mode === MODES.WEB_SEARCH || msg.isRealTime) && (
                    <div className="flex items-center gap-2 mb-4 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full w-fit">
                       <Globe className="w-3.5 h-3.5 text-primary animate-pulse" />
                       <span className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">Web Search Mode</span>
                    </div>
                )}

                {/* Attachment Display */}
                {((msg.attachments && msg.attachments.length > 0) || msg.attachment) && (
                  <div className="flex flex-col gap-3 mb-4 mt-1">
                    {(msg.attachments || (msg.attachment ? [msg.attachment] : [])).map((att, attIdx) => (
                      <div key={attIdx} className="w-full max-w-sm">
                        {att.type === 'image' || att.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <div
                            className="relative group/image overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-md cursor-pointer max-w-[320px]"
                            onClick={() => setViewingDoc(att)}
                          >
                            <img
                              src={att.url}
                              alt="Attachment"
                              className="w-full h-auto max-h-[300px] object-contain bg-black/5"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${msg.role === 'user' ? 'bg-zinc-100/50 border-zinc-200 dark:bg-zinc-800/30 dark:border-zinc-800' : 'bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'}`}>
                            <div
                              className="flex-1 flex items-center gap-3 min-w-0 cursor-pointer"
                              onClick={() => setViewingDoc(att)}
                            >
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${(() => {
                                const name = (att.name || '').toLowerCase();
                                if (name.endsWith('.pdf')) return 'bg-red-50 dark:bg-red-950/30 text-red-500';
                                if (name.match(/\.(doc|docx)$/)) return 'bg-blue-50 dark:bg-blue-950/30 text-blue-500';
                                if (name.match(/\.(xls|xlsx|csv)$/)) return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500';
                                if (name.match(/\.(ppt|pptx)$/)) return 'bg-orange-50 dark:bg-orange-950/30 text-orange-500';
                                return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500';
                              })()}`}>
                                {(() => {
                                  const name = (att.name || '').toLowerCase();
                                  const baseClass = "w-5 h-5";
                                  if (name.match(/\.(xls|xlsx|csv)$/)) return <FileSpreadsheet className={baseClass} />;
                                  if (name.match(/\.(ppt|pptx)$/)) return <Presentation className={baseClass} />;
                                  if (name.endsWith('.pdf')) return <FileText className={baseClass} />;
                                  if (name.match(/\.(doc|docx)$/)) return <FileIcon className={baseClass} />;
                                  return <FileIcon className={baseClass} />;
                                })()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-xs truncate text-slate-800 dark:text-zinc-200 mb-0.5">{att.name || 'File'}</p>
                                <p className="text-[9px] text-zinc-400 uppercase tracking-wider font-semibold">
                                  {(() => {
                                    const name = (att.name || '').toLowerCase();
                                    if (name.endsWith('.pdf')) return 'PDF';
                                    if (name.match(/\.(doc|docx)$/)) return 'Word';
                                    if (name.match(/\.(xls|xlsx|csv)$/)) return 'Excel';
                                    if (name.match(/\.(ppt|pptx)$/)) return 'Powerpoint';
                                    return 'Document';
                                  })()}
                                </p>
                              </div>
                            </div>
                            <a
                              href={att.url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                              onClick={e => e.stopPropagation()}
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed text-maintext">
                  <div className="flex flex-col">
                    <div className={`collapsible-container ${msg.content && msg.content.length > 350 && !expandedMessages[idx] ? 'collapsed-message' : ''}`}>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <div className="my-4 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                                 <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-subtext uppercase tracking-widest">{match[1]}</span>
                                 </div>
                                 <SyntaxHighlighter
                                    language={match[1]}
                                    style={highlighterTheme}
                                    PreTag="div"
                                    className="!bg-zinc-50 dark:!bg-[#0d0d0d] !p-4 !m-0"
                                 >
                                    {String(children).replace(/\n$/, '')}
                                 </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono text-primary font-bold" {...props}>
                                {children}
                              </code>
                            );
                          },
                          img: ({ node, ...props }) => {
                            return (
                              <div className="relative my-4 group/img-container max-w-full">
                                <div 
                                  className="relative group/image overflow-hidden aspect-auto max-w-[500px] cursor-zoom-in w-fit rounded-xl border border-zinc-200 dark:border-zinc-800" 
                                  onClick={() => setViewingDoc({ url: props.src, type: 'image', name: props.alt || 'AI Image' })}
                                >
                                  <img
                                    src={props.src}
                                    alt={props.alt || "AI Image"}
                                    className="max-w-full h-auto object-contain bg-black/5"
                                    loading="lazy"
                                  />
                                </div>
                              </div>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {(msg.content || msg.text) && (msg.content || msg.text).length > 350 && (
                      <div className="flex justify-end w-full mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedMessages(prev => ({ ...prev, [idx]: !prev[idx] }));
                          }}
                          className="p-1.5 text-zinc-400 hover:text-primary hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-center active:scale-95"
                          title={expandedMessages[idx] ? 'Show Less' : 'Show More'}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${expandedMessages[idx] ? 'rotate-180 text-primary' : ''}`}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Url Rendering */}
                {msg.videoUrl && (
                  <div className="relative mt-4 mb-2 w-fit max-w-full">
                    <React.Suspense fallback={<div className="w-full aspect-video bg-black/20 animate-pulse rounded-xl" />}>
                      <CustomVideoPlayer src={msg.videoUrl} compact={true} />
                    </React.Suspense>
                  </div>
                )}

                {/* Image Url Rendering */}
                {msg.imageUrl && (
                  <div
                    className="relative group/generated mt-4 mb-2 overflow-hidden rounded-2xl transition-all duration-500 ease-in-out border border-transparent hover:border-primary/25 hover:shadow-lg hover:shadow-primary/10 cursor-zoom-in w-fit max-w-sm"
                    onClick={() => {
                      setViewingDoc({ url: msg.imageUrl, type: 'image', name: 'Generated Image' });
                    }}
                  >
                    <img
                      src={msg.imageUrl}
                      alt="Generated Content"
                      className="w-full h-auto max-h-[420px] object-contain transition-all duration-500"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Sources List */}
                {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                   <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] font-bold uppercase text-subtext mb-3 flex items-center gap-2 tracking-widest">
                        <ExternalLink className="w-3 h-3" />
                        Shared Sources
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((source, sIdx) => (
                           <a key={sIdx} href={source.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-primary/10 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-maintext transition-all truncate max-w-[140px]">
                              {source.title}
                           </a>
                        ))}
                      </div>
                   </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating CTA for Mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:hidden z-[60]">
         <button 
           onClick={handleDuplicate}
           className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
         >
           <MessageCircle size={18} />
           <span>Continue Chat</span>
         </button>
      </div>

      {/* Document/Image Viewer Modal (Lightbox popup) */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="absolute top-4 right-4 flex items-center gap-2 z-[110]">
            <a 
              href={viewingDoc.url} 
              download 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={20} />
            </a>
            <button 
              onClick={() => setViewingDoc(null)} 
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
          <div className="max-w-full max-h-full flex items-center justify-center w-full h-full" onClick={() => setViewingDoc(null)}>
            <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
              {viewingDoc.type === 'video' || viewingDoc.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                <video src={viewingDoc.url} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
              ) : (
                <img src={viewingDoc.url} alt={viewingDoc.name || "Preview"} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SharedChat;
