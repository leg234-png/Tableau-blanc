import React, { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import Whiteboard from './Whiteboard'
import './TabsManager.css'

// Format A4 en pixels (96 DPI)
const A4_WIDTH_PX = 794
const A4_HEIGHT_PX = 1123
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
// Largeur du canvas : 2x A4 pour plus d'espace de dessin
const CANVAS_WIDTH_PX = A4_WIDTH_PX * 2

const TabsManager = () => {
  const [tabs, setTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)

  const createNewTab = () => {
    setTabs(prev => {
      const newTab = {
        id: Date.now().toString(),
        name: `Feuille ${prev.length + 1}`,
        createdAt: Date.now()
      }
      setActiveTabId(newTab.id)
      return [...prev, newTab]
    })
  }

  // Initialiser avec un premier onglet
  useEffect(() => {
    const savedTabs = localStorage.getItem('whiteboard-tabs')
    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs)
        if (parsedTabs.length > 0) {
          setTabs(parsedTabs)
          setActiveTabId(parsedTabs[0].id)
        } else {
          // Créer un premier onglet si la liste est vide
          const newTab = {
            id: Date.now().toString(),
            name: 'Feuille 1',
            createdAt: Date.now()
          }
          setTabs([newTab])
          setActiveTabId(newTab.id)
        }
      } catch (e) {
        // En cas d'erreur, créer un premier onglet
        const newTab = {
          id: Date.now().toString(),
          name: 'Feuille 1',
          createdAt: Date.now()
        }
        setTabs([newTab])
        setActiveTabId(newTab.id)
      }
    } else {
      // Créer un premier onglet si aucune sauvegarde
      const newTab = {
        id: Date.now().toString(),
        name: 'Feuille 1',
        createdAt: Date.now()
      }
      setTabs([newTab])
      setActiveTabId(newTab.id)
    }
  }, [])

  // Sauvegarder les onglets
  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem('whiteboard-tabs', JSON.stringify(tabs))
    }
  }, [tabs])

  const deleteTab = (tabId, e) => {
    e.stopPropagation()
    setTabs(prev => {
      if (prev.length === 1) {
        // Ne pas supprimer le dernier onglet, créer-en un nouveau à la place
        const newTab = {
          id: Date.now().toString(),
          name: 'Feuille 1',
          createdAt: Date.now()
        }
        // Supprimer l'ancienne sauvegarde et créer un nouvel onglet
        localStorage.removeItem(`whiteboard-save-${tabId}`)
        setActiveTabId(newTab.id)
        return [newTab]
      }

      const newTabs = prev.filter(tab => tab.id !== tabId)
      
      // Si l'onglet supprimé était actif, activer un autre
      if (activeTabId === tabId) {
        const index = prev.findIndex(t => t.id === tabId)
        const newActiveIndex = index > 0 ? index - 1 : 0
        setActiveTabId(newTabs[newActiveIndex].id)
      }

      // Supprimer la sauvegarde de cet onglet
      localStorage.removeItem(`whiteboard-save-${tabId}`)
      return newTabs
    })
  }

  const renameTab = (tabId, newName) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, name: newName } : tab
    ))
  }

  const activeTab = tabs.find(tab => tab.id === activeTabId)

  // Fonction pour détecter si une zone du canvas contient du contenu (en excluant les bordures)
  const hasContent = (canvas, x, y, width, height) => {
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(x, y, width, height)
    const data = imageData.data
    
    // Couleur de la bordure à ignorer (#d0d0d0 = rgb(208, 208, 208))
    const BORDER_R = 208
    const BORDER_G = 208
    const BORDER_B = 208
    const BORDER_TOLERANCE = 5 // Tolérance pour la détection de la bordure
    
    // Vérifier si au moins un pixel n'est pas blanc/transparent et n'est pas une bordure
    for (let i = 3; i < data.length; i += 4) {
      const alpha = data[i]
      if (alpha > 0) {
        const r = data[i - 3]
        const g = data[i - 2]
        const b = data[i - 1]
        
        // Ignorer les pixels blancs purs
        if (r >= 250 && g >= 250 && b >= 250) {
          continue
        }
        
        // Ignorer les pixels qui sont des bordures (gris #d0d0d0)
        const isBorder = Math.abs(r - BORDER_R) < BORDER_TOLERANCE &&
                        Math.abs(g - BORDER_G) < BORDER_TOLERANCE &&
                        Math.abs(b - BORDER_B) < BORDER_TOLERANCE
        
        if (!isBorder) {
          return true
        }
      }
    }
    return false
  }

  // Fonction pour trouver les limites du contenu
  const findContentBounds = (canvas) => {
    const width = canvas.width
    const height = canvas.height
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    let hasAnyContent = false

    // Échantillonner le canvas pour trouver les limites (pas besoin de vérifier chaque pixel)
    const step = 10 // Vérifier tous les 10 pixels pour la performance
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if (hasContent(canvas, x, y, Math.min(step, width - x), Math.min(step, height - y))) {
          hasAnyContent = true
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x + step)
          maxY = Math.max(maxY, y + step)
        }
      }
    }

    if (!hasAnyContent) return null

    // Ajouter une marge
    const margin = 20
    return {
      x: Math.max(0, minX - margin),
      y: Math.max(0, minY - margin),
      width: Math.min(width, maxX - minX + margin * 2),
      height: Math.min(height, maxY - minY + margin * 2)
    }
  }

  const handleExportAllPDF = async () => {
    if (tabs.length === 0) return

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    let firstPage = true

    // Fonction pour traiter un onglet
    const processTab = (tab) => {
      return new Promise((resolve) => {
        const saveKey = `whiteboard-save-${tab.id}`
        const saved = localStorage.getItem(saveKey)
        
        if (!saved) {
          resolve(null)
          return
        }

        // Créer un canvas temporaire pour charger l'image (avec la nouvelle largeur étendue)
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = CANVAS_WIDTH_PX
        tempCanvas.height = A4_HEIGHT_PX
        const tempCtx = tempCanvas.getContext('2d')

        // Charger l'image sauvegardée
        const img = new Image()
        img.onload = () => {
          tempCtx.drawImage(img, 0, 0)

          // Créer un canvas sans bordures pour l'export
          const cleanCanvas = document.createElement('canvas')
          cleanCanvas.width = CANVAS_WIDTH_PX
          cleanCanvas.height = A4_HEIGHT_PX
          const cleanCtx = cleanCanvas.getContext('2d')
          
          // Copier le contenu en excluant les bordures
          const imageData = tempCtx.getImageData(0, 0, CANVAS_WIDTH_PX, A4_HEIGHT_PX)
          const data = imageData.data
          const BORDER_R = 208
          const BORDER_G = 208
          const BORDER_B = 208
          const BORDER_TOLERANCE = 5
          
          // Remplacer les pixels de bordure par du blanc
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            
            const isBorder = Math.abs(r - BORDER_R) < BORDER_TOLERANCE &&
                            Math.abs(g - BORDER_G) < BORDER_TOLERANCE &&
                            Math.abs(b - BORDER_B) < BORDER_TOLERANCE
            
            if (isBorder) {
              data[i] = 255     // R
              data[i + 1] = 255 // G
              data[i + 2] = 255 // B
              data[i + 3] = 0   // A (transparent)
            }
          }
          
          cleanCtx.putImageData(imageData, 0, 0)

          // Trouver les limites du contenu sur le canvas nettoyé
          const bounds = findContentBounds(cleanCanvas)
          
          if (!bounds) {
            resolve(null)
            return
          }

          // Calculer le ratio de compression pour que tout rentre dans une page A4
          // Avec des marges de 10mm de chaque côté
          const marginMm = 10
          const availableWidthMm = A4_WIDTH_MM - (marginMm * 2)
          const availableHeightMm = A4_HEIGHT_MM - (marginMm * 2)
          
          const pixelsPerMm = A4_WIDTH_PX / A4_WIDTH_MM
          const contentWidthMm = bounds.width / pixelsPerMm
          const contentHeightMm = bounds.height / pixelsPerMm
          
          // Calculer les ratios de compression nécessaires
          const widthRatio = availableWidthMm / contentWidthMm
          const heightRatio = availableHeightMm / contentHeightMm
          
          // Utiliser le ratio le plus petit pour garder les proportions
          const scaleRatio = Math.min(widthRatio, heightRatio, 1) // Ne pas agrandir si c'est déjà plus petit
          
          // Dimensions finales en mm
          const finalWidthMm = contentWidthMm * scaleRatio
          const finalHeightMm = contentHeightMm * scaleRatio
          
          // Position centrée dans la page A4
          const xOffsetMm = (A4_WIDTH_MM - finalWidthMm) / 2
          const yOffsetMm = (A4_HEIGHT_MM - finalHeightMm) / 2

          // Créer un canvas temporaire pour le contenu redimensionné
          const contentCanvas = document.createElement('canvas')
          contentCanvas.width = bounds.width
          contentCanvas.height = bounds.height
          const contentCtx = contentCanvas.getContext('2d')
          
          // Dessiner uniquement la zone avec du contenu (sans bordures)
          contentCtx.drawImage(
            cleanCanvas,
            bounds.x, bounds.y, bounds.width, bounds.height,
            0, 0, bounds.width, bounds.height
          )

          // Convertir en image
          const imgData = contentCanvas.toDataURL('image/png', 1.0)

          // Ajouter une nouvelle page si ce n'est pas la première
          if (!firstPage) {
            pdf.addPage()
          }
          firstPage = false

          // Ajouter l'image au PDF en la redimensionnant pour qu'elle rentre dans A4
          pdf.addImage(imgData, 'PNG', xOffsetMm, yOffsetMm, finalWidthMm, finalHeightMm)

          resolve(true)
        }
        img.onerror = () => resolve(null)
        img.src = saved
      })
    }

    // Traiter tous les onglets de manière séquentielle
    for (const tab of tabs) {
      await processTab(tab)
    }

    // Sauvegarder le PDF
    if (!firstPage) {
      const fileName = 'toutes_les_feuilles.pdf'
      pdf.save(fileName)
    } else {
      pdf.text('Aucun contenu à exporter', 10, 20)
      pdf.save('toutes_les_feuilles.pdf')
    }
  }

  return (
    <div className="tabs-manager">
      <div className="tabs-bar">
        <div className="tabs-list">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`tab-item ${activeTabId === tab.id ? 'active' : ''}`}
              onMouseDown={(e) => {
                // Ne pas changer d'onglet si on clique sur l'input ou le span
                if (e.target.tagName === 'INPUT' || e.target.className === 'tab-name-display') {
                  return
                }
                // Empêcher la sélection de texte et changer d'onglet
                e.preventDefault()
                setActiveTabId(tab.id)
              }}
            >
              <span
                className="tab-name-display"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveTabId(tab.id)
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  const input = e.target.nextSibling
                  if (input) {
                    input.style.display = 'block'
                    input.focus()
                    input.select()
                  }
                }}
              >
                {tab.name}
              </span>
              <input
                type="text"
                value={tab.name}
                onChange={(e) => renameTab(tab.id, e.target.value)}
                onBlur={(e) => {
                  e.target.style.display = 'none'
                  if (!e.target.value.trim()) {
                    renameTab(tab.id, `Feuille ${tabs.indexOf(tab) + 1}`)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.target.blur()
                  }
                  if (e.key === 'Escape') {
                    renameTab(tab.id, tab.name)
                    e.target.blur()
                  }
                }}
                className="tab-name-input"
                style={{ display: 'none' }}
              />
              <button
                className="tab-close-btn"
                onClick={(e) => deleteTab(tab.id, e)}
                title="Fermer l'onglet"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          className="add-tab-btn"
          onClick={createNewTab}
          title="Nouvelle feuille"
        >
          +
        </button>
        <button
          className="export-all-btn"
          onClick={handleExportAllPDF}
          title="Exporter toutes les feuilles en PDF"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Exporter tout
        </button>
      </div>
      {activeTab && (
        <Whiteboard key={activeTabId} tabId={activeTabId} tabName={activeTab.name} />
      )}
    </div>
  )
}

export default TabsManager

