import React, { useRef, useEffect, useState, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import './Whiteboard.css'

// Format A4 : 210mm × 297mm
// À 96 DPI : 1mm = 3.7795px
// Largeur A4 : 210mm × 3.7795 = 794px
// Hauteur A4 : 297mm × 3.7795 = 1123px
const A4_WIDTH_PX = 794
const A4_HEIGHT_PX = 1123
// Largeur du canvas : 2x A4 pour plus d'espace de dessin
const CANVAS_WIDTH_PX = A4_WIDTH_PX * 2
const VIRTUAL_CANVAS_HEIGHT = A4_HEIGHT_PX // 1 format A4 par feuille

const Whiteboard = ({ tabId, tabName }) => {
  const canvasRef = useRef(null) // Canvas visible
  const virtualCanvasRef = useRef(null) // Canvas virtuel (invisible, très grand)
  const containerRef = useRef(null) // Container avec scroll
  const [isDrawing, setIsDrawing] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [currentTool, setCurrentTool] = useState('pen')
  const [brushSize, setBrushSize] = useState(5)
  const [eraserSize, setEraserSize] = useState(25)
  const [penColor, setPenColor] = useState('#007bff') // Couleur du stylo
  const [ctx, setCtx] = useState(null) // Contexte du canvas visible
  const [virtualCtx, setVirtualCtx] = useState(null) // Contexte du canvas virtuel
  const [scrollY, setScrollY] = useState(0)
  const [selectionStart, setSelectionStart] = useState(null)
  const [selectionEnd, setSelectionEnd] = useState(null)
  const savedCanvasRef = useRef(null)

  // Couleurs prédéfinies
  const colors = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC',
    '#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1',
    '#17a2b8', '#fd7e14', '#e83e8c', '#20c997', '#6c757d'
  ]

  // Initialisation des canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const virtualCanvas = virtualCanvasRef.current
    const container = containerRef.current
    if (!canvas || !virtualCanvas || !container) return

    const context = canvas.getContext('2d')
    const virtualContext = virtualCanvas.getContext('2d')
    setCtx(context)
    setVirtualCtx(virtualContext)

    // Configuration du canvas virtuel en format A4
      virtualCanvas.width = CANVAS_WIDTH_PX
    virtualCanvas.height = VIRTUAL_CANVAS_HEIGHT

    // Fonction pour dessiner les bordures A4 sur le canvas virtuel
    const drawA4Borders = () => {
      const borderColor = '#d0d0d0'
      const borderWidth = 1
      
      virtualContext.strokeStyle = borderColor
      virtualContext.lineWidth = borderWidth
      virtualContext.setLineDash([])
      
      // Dessiner la bordure du rectangle (largeur étendue, hauteur A4)
      virtualContext.strokeRect(0, 0, CANVAS_WIDTH_PX, A4_HEIGHT_PX)
    }

    // Fonction locale pour rendre la portion visible
    const renderVisible = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      
      // Dessiner le canvas virtuel (qui fait maintenant exactement A4)
      context.drawImage(
        virtualCanvas,
        0, 0, canvas.width, canvas.height,
        0, 0, canvas.width, canvas.height
      )
      
      // Dessiner les bordures A4
      const borderColor = '#d0d0d0'
      const borderWidth = 1
      
      context.strokeStyle = borderColor
      context.lineWidth = borderWidth
      context.setLineDash([])
      
      // Dessiner la bordure complète du rectangle (largeur étendue)
      context.strokeRect(0, 0, CANVAS_WIDTH_PX, Math.min(canvas.height, A4_HEIGHT_PX))
    }

    const resizeCanvas = () => {
      const containerHeight = container.clientHeight
      // Le canvas visible doit avoir la largeur A4 mais s'adapter à la hauteur du container
      canvas.width = CANVAS_WIDTH_PX
      canvas.height = Math.min(containerHeight, A4_HEIGHT_PX)
      canvas.style.width = `${CANVAS_WIDTH_PX}px`
      canvas.style.height = `${Math.min(containerHeight, A4_HEIGHT_PX)}px`
      
      // Configuration optimale pour le dessin fluide
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.strokeStyle = penColor
      context.lineWidth = brushSize
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'

      virtualCanvas.width = CANVAS_WIDTH_PX
      virtualCanvas.height = VIRTUAL_CANVAS_HEIGHT

      virtualContext.lineCap = 'round'
      virtualContext.lineJoin = 'round'
      virtualContext.strokeStyle = penColor
      virtualContext.lineWidth = brushSize
      virtualContext.imageSmoothingEnabled = true
      virtualContext.imageSmoothingQuality = 'high'
      
      // Re-rendre après le redimensionnement
      renderVisible()
    }

    resizeCanvas()
    
    // Dessiner les bordures A4 sur le canvas virtuel
    drawA4Borders()
    
    window.addEventListener('resize', resizeCanvas)

    // Gérer le scroll
    const handleScroll = () => {
      setScrollY(container.scrollTop)
      renderVisible()
    }
    container.addEventListener('scroll', handleScroll)

    // Charger la sauvegarde
    const saveKey = tabId ? `whiteboard-save-${tabId}` : 'whiteboard-save'
    const saved = localStorage.getItem(saveKey)
    if (saved) {
      const img = new Image()
      img.onload = () => {
        virtualContext.drawImage(img, 0, 0)
        // Redessiner les bordures après le chargement
        drawA4Borders()
        renderVisible()
      }
      img.src = saved
    } else {
      // Si pas de sauvegarde, juste rendre avec les bordures
      renderVisible()
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      container.removeEventListener('scroll', handleScroll)
    }
  }, [tabId, penColor, brushSize])

  // Rendre la portion visible du canvas virtuel
  const renderVisibleCanvas = useCallback(() => {
    if (!ctx || !virtualCanvasRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const virtualCanvas = virtualCanvasRef.current
    const container = containerRef.current
    if (!container) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Calculer la zone visible dans le canvas virtuel
    const currentScrollY = container.scrollTop
    const sourceY = Math.max(0, Math.min(currentScrollY, VIRTUAL_CANVAS_HEIGHT - canvas.height))
    const sourceHeight = Math.min(canvas.height, VIRTUAL_CANVAS_HEIGHT - sourceY)
    
    // Dessiner la portion visible
    if (sourceHeight > 0) {
      ctx.drawImage(
        virtualCanvas,
        0, sourceY, canvas.width, sourceHeight,
        0, 0, canvas.width, sourceHeight
      )
    }
  }, [ctx])

  // Re-rendre quand le scroll change
  useEffect(() => {
    renderVisibleCanvas()
  }, [scrollY, renderVisibleCanvas])

  // Mettre à jour le style du contexte quand la taille change
  useEffect(() => {
    if (ctx && virtualCtx) {
      const size = currentTool === 'eraser' ? eraserSize : brushSize
      ctx.lineWidth = size
      virtualCtx.lineWidth = size
      
      // S'assurer que la couleur est à jour aussi
      if (currentTool === 'pen') {
        ctx.strokeStyle = penColor
        virtualCtx.strokeStyle = penColor
      }
    }
  }, [brushSize, eraserSize, currentTool, ctx, virtualCtx, penColor])

  // Mettre à jour le mode de dessin selon l'outil
  useEffect(() => {
    if (ctx && virtualCtx) {
      const size = currentTool === 'eraser' ? eraserSize : brushSize
      if (currentTool === 'pen') {
        ctx.globalCompositeOperation = 'source-over'
        virtualCtx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = penColor
        virtualCtx.strokeStyle = penColor
        ctx.lineWidth = brushSize
        virtualCtx.lineWidth = brushSize
      } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        virtualCtx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = eraserSize
        virtualCtx.lineWidth = eraserSize
      }
    }
    
    if (currentTool !== 'select' && isSelecting) {
      setIsSelecting(false)
      setSelectionStart(null)
      setSelectionEnd(null)
      savedCanvasRef.current = null
    }
  }, [currentTool, ctx, virtualCtx, isSelecting, penColor, brushSize, eraserSize])

  // Sauvegarde automatique
  useEffect(() => {
    const interval = setInterval(() => {
      if (virtualCanvasRef.current && tabId) {
        const dataURL = virtualCanvasRef.current.toDataURL()
        const saveKey = `whiteboard-save-${tabId}`
        localStorage.setItem(saveKey, dataURL)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [tabId])

  const getCoordinates = useCallback((e) => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    let clientX, clientY

    if (e.pointerId !== undefined) {
      clientX = e.clientX
      clientY = e.clientY
    } else if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY + scrollY, // Ajouter le scroll pour obtenir la position dans le canvas virtuel
      pressure: e.pressure || 0.5
    }
  }, [scrollY])

  const startDrawing = useCallback((e) => {
    e.preventDefault()
    if (!virtualCtx || currentTool === 'select') return

    // S'assurer que la couleur et la taille sont à jour avant de commencer à dessiner
    if (currentTool === 'pen') {
      virtualCtx.strokeStyle = penColor
      virtualCtx.lineWidth = brushSize
    } else if (currentTool === 'eraser') {
      virtualCtx.lineWidth = eraserSize
    }

    setIsDrawing(true)
    const coords = getCoordinates(e)
    
    virtualCtx.beginPath()
    virtualCtx.moveTo(coords.x, coords.y)
    
    // Dessiner un point initial
    virtualCtx.lineTo(coords.x, coords.y)
    virtualCtx.stroke()
    renderVisibleCanvas()
  }, [virtualCtx, getCoordinates, currentTool, renderVisibleCanvas, penColor, brushSize, eraserSize])

  const startSelection = useCallback((e) => {
    if (currentTool !== 'select') return
    e.preventDefault()
    
    if (e.pointerId !== undefined && e.currentTarget) {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    
    if (ctx && canvasRef.current) {
      const canvas = canvasRef.current
      if (!savedCanvasRef.current) {
        savedCanvasRef.current = document.createElement('canvas')
      }
      const savedCanvas = savedCanvasRef.current
      savedCanvas.width = canvas.width
      savedCanvas.height = canvas.height
      const savedCtx = savedCanvas.getContext('2d')
      savedCtx.drawImage(canvas, 0, 0)
    }
    
    const coords = getCoordinates(e)
    setIsSelecting(true)
    setSelectionStart(coords)
    setSelectionEnd(coords)
  }, [currentTool, getCoordinates, ctx])

  const draw = useCallback((e) => {
    e.preventDefault()

    if (currentTool === 'select' && isSelecting) {
      const coords = getCoordinates(e)
      setSelectionEnd(coords)
      return
    }

    if (!isDrawing || !virtualCtx) return

    // S'assurer que la couleur et la taille sont à jour avant de dessiner
    const currentSize = currentTool === 'eraser' ? eraserSize : brushSize
    if (currentTool === 'pen') {
      virtualCtx.strokeStyle = penColor
      virtualCtx.lineWidth = brushSize
    } else if (currentTool === 'eraser') {
      virtualCtx.lineWidth = eraserSize
    }

    const coords = getCoordinates(e)
    
    const savedFillStyle = virtualCtx.fillStyle
    const savedStrokeStyle = virtualCtx.strokeStyle
    
    virtualCtx.lineTo(coords.x, coords.y)
    virtualCtx.stroke()
    
    virtualCtx.beginPath()
    virtualCtx.fillStyle = virtualCtx.strokeStyle
    virtualCtx.arc(coords.x, coords.y, currentSize / 2, 0, Math.PI * 2)
    virtualCtx.fill()
    
    virtualCtx.fillStyle = savedFillStyle
    virtualCtx.beginPath()
    virtualCtx.moveTo(coords.x, coords.y)

    // Redessiner les bordures A4 après le dessin (elles sont au-dessus du contenu)
    const borderColor = '#d0d0d0'
    virtualCtx.strokeStyle = borderColor
    virtualCtx.lineWidth = 1
    virtualCtx.setLineDash([])
    virtualCtx.strokeRect(0, 0, CANVAS_WIDTH_PX, A4_HEIGHT_PX)
    
    // Restaurer les styles pour le prochain dessin (avec la couleur et taille à jour)
    if (currentTool === 'pen') {
      virtualCtx.strokeStyle = penColor
      virtualCtx.lineWidth = brushSize
    } else if (currentTool === 'eraser') {
      virtualCtx.lineWidth = eraserSize
    } else {
      virtualCtx.strokeStyle = savedStrokeStyle
    }

    // Re-rendre la portion visible
    renderVisibleCanvas()
  }, [isDrawing, virtualCtx, getCoordinates, currentTool, isSelecting, renderVisibleCanvas, penColor, brushSize, eraserSize])

  const stopDrawing = useCallback((e) => {
    e.preventDefault()

    if (e.pointerId !== undefined && e.currentTarget) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }

    if (currentTool === 'select' && isSelecting && selectionStart && selectionEnd) {
      if (virtualCtx && virtualCanvasRef.current && savedCanvasRef.current) {
        const canvas = canvasRef.current
        const savedCanvas = savedCanvasRef.current
        
        // Convertir les coordonnées de sélection vers le canvas virtuel
        const startX = Math.min(selectionStart.x, selectionEnd.x)
        const startY = Math.min(selectionStart.y, selectionEnd.y)
        const width = Math.abs(selectionEnd.x - selectionStart.x)
        const height = Math.abs(selectionEnd.y - selectionStart.y)

        virtualCtx.clearRect(startX, startY, width, height)
        
        // Redessiner les bordures A4 après l'effacement
        const savedStrokeStyleSel = virtualCtx.strokeStyle
        const savedLineWidthSel = virtualCtx.lineWidth
        virtualCtx.strokeStyle = '#d0d0d0'
        virtualCtx.lineWidth = 1
        virtualCtx.setLineDash([])
        virtualCtx.strokeRect(0, 0, CANVAS_WIDTH_PX, A4_HEIGHT_PX)
        virtualCtx.strokeStyle = savedStrokeStyleSel
        virtualCtx.lineWidth = savedLineWidthSel
        
        renderVisibleCanvas()
      }
      
      setIsSelecting(false)
      setSelectionStart(null)
      setSelectionEnd(null)
      savedCanvasRef.current = null
      return
    }

    if (isDrawing) {
      setIsDrawing(false)
    }
  }, [isDrawing, currentTool, isSelecting, selectionStart, selectionEnd, virtualCtx, renderVisibleCanvas])

  const handleClear = () => {
    if (window.confirm('Voulez-vous effacer tout le tableau ?')) {
      if (virtualCtx && virtualCanvasRef.current) {
        virtualCtx.clearRect(0, 0, virtualCanvasRef.current.width, virtualCanvasRef.current.height)
        // Redessiner les bordures A4 après l'effacement
        const borderColor = '#d0d0d0'
        const borderWidth = 1
        virtualCtx.strokeStyle = borderColor
        virtualCtx.lineWidth = borderWidth
        virtualCtx.setLineDash([])
        virtualCtx.strokeRect(0, 0, CANVAS_WIDTH_PX, A4_HEIGHT_PX)
        renderVisibleCanvas()
      }
    }
  }

  const handleExportPDF = () => {
    if (!virtualCanvasRef.current) return

    const virtualCanvas = virtualCanvasRef.current
    const canvasWidth = virtualCanvas.width // Déjà en format A4 (794px)
    const canvasHeight = virtualCanvas.height // 3x A4 (3369px)

    // Format A4 en mm : 210mm × 297mm
    const A4_WIDTH_MM = 210
    const A4_HEIGHT_MM = 297

    // Le canvas est déjà dimensionné en A4, donc on peut directement exporter
    // Calculer le nombre de pages nécessaires (3 pages en hauteur)
    const pagesHeight = Math.ceil(canvasHeight / A4_HEIGHT_PX)

    // Créer le PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Pour chaque page A4
    for (let pageY = 0; pageY < pagesHeight; pageY++) {
      if (pageY > 0) {
        pdf.addPage()
      }

      // Calculer la zone à exporter pour cette page (en pixels)
      const sourceY = pageY * A4_HEIGHT_PX
      const sourceHeight = Math.min(A4_HEIGHT_PX, canvasHeight - sourceY)

      if (sourceHeight <= 0) continue

      // Créer un canvas temporaire pour cette page
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = A4_WIDTH_PX
      tempCanvas.height = sourceHeight
      const tempCtx = tempCanvas.getContext('2d')
      
      // Dessiner la portion du canvas virtuel sur le canvas temporaire
      tempCtx.drawImage(
        virtualCanvas,
        0, sourceY, A4_WIDTH_PX, sourceHeight,
        0, 0, A4_WIDTH_PX, sourceHeight
      )

      // Convertir en image et ajouter au PDF
      const imgData = tempCanvas.toDataURL('image/png', 1.0)
      
      // Ajouter l'image au PDF en format A4 complet
      pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM)
    }

    // Télécharger le PDF
    const fileName = (tabName || 'feuille').replace(/[^a-z0-9]/gi, '_')
    pdf.save(`${fileName}.pdf`)
  }

  const handleBrushSizeChange = (e) => {
    setBrushSize(parseInt(e.target.value))
  }

  const handleEraserSizeChange = (e) => {
    setEraserSize(parseInt(e.target.value))
  }

  // Effet pour redessiner la sélection
  useEffect(() => {
    if (isSelecting && selectionStart && selectionEnd && ctx && canvasRef.current && savedCanvasRef.current) {
      const canvas = canvasRef.current
      const savedCanvas = savedCanvasRef.current
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(savedCanvas, 0, 0)

      const startX = Math.min(selectionStart.x, selectionEnd.x)
      const startY = Math.min(selectionStart.y - scrollY, selectionEnd.y - scrollY)
      const width = Math.abs(selectionEnd.x - selectionStart.x)
      const height = Math.abs(selectionEnd.y - selectionStart.y)

      ctx.strokeStyle = '#007bff'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(startX, startY, width, height)
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(0, 123, 255, 0.1)'
      ctx.fillRect(startX, startY, width, height)
    }
  }, [isSelecting, selectionStart, selectionEnd, ctx, scrollY])

  // Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'e' || e.key === 'E') {
        setCurrentTool('eraser')
      } else if (e.key === 'p' || e.key === 'P') {
        setCurrentTool('pen')
      } else if (e.key === 's' || e.key === 'S') {
        setCurrentTool('select')
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleClear()
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        if (currentTool === 'eraser') {
          setEraserSize(prev => Math.min(100, prev + 2))
        } else {
          setBrushSize(prev => Math.min(50, prev + 1))
        }
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        if (currentTool === 'eraser') {
          setEraserSize(prev => Math.max(5, prev - 2))
        } else {
          setBrushSize(prev => Math.max(2, prev - 1))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentTool])

  return (
    <div className="whiteboard-container">
      <div className="toolbar">
        <div className="tool-group">
          <button
            className={`tool-btn ${currentTool === 'pen' ? 'active' : ''}`}
            onClick={() => setCurrentTool('pen')}
            title="Stylo (P)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
              <path d="M2 2l7.586 7.586"></path>
              <circle cx="11" cy="11" r="2"></circle>
            </svg>
          </button>
          <button
            className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
            onClick={() => setCurrentTool('eraser')}
            title="Gomme (E)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              <path d="M13 13L9 9"></path>
            </svg>
          </button>
          <button
            className={`tool-btn ${currentTool === 'select' ? 'active' : ''}`}
            onClick={() => setCurrentTool('select')}
            title="Sélection rectangulaire (S)"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        </div>
        {currentTool === 'pen' && (
          <div className="tool-group">
            <div className="color-picker">
              <span>Couleur:</span>
              <div className="color-palette">
                {colors.map(color => (
                  <button
                    key={color}
                    className={`color-btn ${penColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setPenColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="tool-group">
          <button className="tool-btn" onClick={handleClear} title="Effacer tout">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            </svg>
          </button>
          <button className="tool-btn" onClick={handleExportPDF} title="Exporter en PDF">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </button>
        </div>
        {currentTool === 'pen' && (
          <div className="tool-group">
            <label className="size-label">
              <span>Taille stylo:</span>
              <input
                type="range"
                id="brush-size"
                min="2"
                max="50"
                value={brushSize}
                onChange={handleBrushSizeChange}
              />
              <span id="size-value">{brushSize}</span>
            </label>
          </div>
        )}
        {currentTool === 'eraser' && (
          <div className="tool-group">
            <label className="size-label">
              <span>Taille gomme:</span>
              <input
                type="range"
                id="eraser-size"
                min="5"
                max="100"
                value={eraserSize}
                onChange={handleEraserSizeChange}
              />
              <span id="size-value">{eraserSize}</span>
            </label>
          </div>
        )}
      </div>

      <div 
        ref={containerRef}
        className={`canvas-container ${currentTool === 'eraser' ? 'eraser-mode' : ''} ${currentTool === 'select' ? 'select-mode' : ''}`}
      >
        <div style={{ height: VIRTUAL_CANVAS_HEIGHT, position: 'relative', width: `${CANVAS_WIDTH_PX}px` }}>
          <canvas
            ref={virtualCanvasRef}
            style={{ display: 'none' }}
          />
          <canvas
            ref={canvasRef}
            id="whiteboard"
            style={{ 
              touchAction: 'none',
              position: 'sticky',
              top: 0,
              width: `${CANVAS_WIDTH_PX}px`
            }}
            onPointerDown={(e) => {
              e.preventDefault()
              if (currentTool === 'select') {
                startSelection(e)
              } else {
                startDrawing(e)
              }
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              e.preventDefault()
              draw(e)
            }}
            onPointerUp={(e) => {
              e.preventDefault()
              stopDrawing(e)
              e.currentTarget.releasePointerCapture(e.pointerId)
            }}
            onPointerLeave={(e) => {
              e.preventDefault()
              stopDrawing(e)
            }}
            onPointerCancel={(e) => {
              e.preventDefault()
              stopDrawing(e)
            }}
            onMouseDown={(e) => {
              if (currentTool === 'select') {
                startSelection(e)
              } else {
                startDrawing(e)
              }
            }}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={(e) => {
              e.preventDefault()
              if (currentTool === 'select') {
                startSelection(e)
              } else {
                startDrawing(e)
              }
            }}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
          />
        </div>
      </div>

      <div className="status-bar">
        <span id="tool-status">
          {currentTool === 'pen' && `Stylo activé (${penColor})`}
          {currentTool === 'eraser' && 'Gomme activée'}
          {currentTool === 'select' && 'Sélection rectangulaire activée'}
        </span>
        <span className="hint">
          💡 P=Stylo, E=Gomme, S=Sélection | +/- = Taille | Scroll infini
        </span>
      </div>
    </div>
  )
}

export default Whiteboard
