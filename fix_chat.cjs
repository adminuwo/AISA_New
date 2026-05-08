const fs = require('fs');
let code = fs.readFileSync('src/pages/Chat.jsx', 'utf8');

const regex = /  const handleCopyImage = async \(imageUrl\) => \{[\s\S]*?  \};\r?\n  const \{ sessionId \} = useParams\(\);/m;

const newFunc = `  const handleCopyImage = async (imageUrl) => {
    if (!imageUrl) return;
    const t = toast.loading('Attempting to copy...');

    try {
      const makeImagePromise = async () => {
        let blob;
        try {
          const response = await fetch(imageUrl);
          blob = await response.blob();
        } catch (e) {
          const proxiedUrl = \`\${apis.imageProxy}?url=\${encodeURIComponent(imageUrl)}\`;
          const response = await fetch(proxiedUrl);
          blob = await response.blob();
        }

        if (blob.type === 'image/png') return blob;

        return await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error('Canvas toBlob failed'));
              }, 'image/png');
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => reject(new Error('Image conversion failed'));
          img.src = URL.createObjectURL(blob);
        });
      };

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': makeImagePromise() })
        ]);
        toast.dismiss(t);
        toast.success('Image copied! ✨');
      } catch (err) {
        if (err.name === 'TypeError') {
          const blob = await makeImagePromise();
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          toast.dismiss(t);
          toast.success('Image copied! ✨');
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error('Copy failure:', err);
      toast.dismiss(t);
      if (!window.isSecureContext) {
        toast.error((t) => (<span className="flex flex-col gap-1"><span className="font-bold text-xs text-amber-500">Insecure Connection (HTTP)</span><span className="text-[10px] opacity-80 leading-tight">Browsers block image copying on HTTP sites. Use <b>HTTPS</b> or <b>Right-Click &gt; Copy Image</b>.</span></span>), { duration: 6000 });
      } else {
        toast.error((t) => (<span className="flex flex-col gap-1"><span className="font-bold text-xs">Copy failed</span><span className="text-[10px] opacity-80 leading-tight">Browser security blocked the action. Please <b>right-click</b> and <b>"Copy Image"</b> instead.</span></span>), { duration: 4000 });
      }
    }
  };
  const { sessionId } = useParams();`;

code = code.replace(regex, newFunc);
fs.writeFileSync('src/pages/Chat.jsx', code);
