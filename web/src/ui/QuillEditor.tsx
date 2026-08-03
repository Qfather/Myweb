import { useEffect, useRef } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

// 所见即所得编辑器（Quill），输出 HTML；支持图片上传 + 视频链接嵌入
export default function QuillEditor({
  value,
  onChange,
  placeholder = '在这里编辑...',
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<Quill | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  // 避免每次渲染重建，用 ref 记录最近一次外部 value 以判断是否来自编辑器本身
  const lastEmitRef = useRef('')

  useEffect(() => {
    if (!hostRef.current || quillRef.current) return

    // 图片上传处理：选文件 → 上传服务器 → 插入 URL
    const imageHandler = () => {
      const q = quillRef.current
      if (!q) return
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return
        const fd = new FormData()
        fd.append('file', file)
        try {
          const r = await (await fetch('/admin/upload', { method: 'POST', credentials: 'include', body: fd })).json()
          if (r.code === 0 && q) {
            const range = q.getSelection(true)
            q.insertEmbed(range.index, 'image', r.data.url)
            q.setSelection(range.index + 1)
          }
        } catch (e) {
          console.warn('图片上传失败', e)
        }
      }
      input.click()
    }

    const videoHandler = () => {
      const q = quillRef.current
      if (!q) return
      const url = window.prompt('输入视频链接（YouTube/B站等）')
      if (!url) return
      const range = q.getSelection(true)
      q.insertEmbed(range.index, 'video', url)
      q.setSelection(range.index + 1)
    }

    const q = new Quill(hostRef.current, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: {
          container: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['blockquote', 'code-block'],
            ['link', 'image', 'video'],
            ['clean'],
          ],
          handlers: {
            image: imageHandler,
            video: videoHandler,
          },
        },
      },
    })
    q.on('text-change', () => {
      const html = q.root.innerHTML
      lastEmitRef.current = html
      onChangeRef.current(html)
    })
    quillRef.current = q
  }, [placeholder])

  // 外部 value 变化且不是本编辑器发出的 → 同步到编辑器
  useEffect(() => {
    const q = quillRef.current
    if (!q) return
    const cur = q.root.innerHTML
    if (cur !== value && lastEmitRef.current !== value) {
      q.root.innerHTML = value
    }
  }, [value])

  return (
    <div className="quill-wrap">
      <div ref={hostRef} style={{ minHeight: 180 }} />
    </div>
  )
}
