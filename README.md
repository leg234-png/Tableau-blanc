# 🎨 Tableau Blanc React - Programmation Compétitive

Un tableau blanc interactif moderne avec React.js, stylo bleu et gomme, spécialement conçu pour réfléchir sur vos problèmes de programmation compétitive.

## ✨ Fonctionnalités

- **Stylo bleu** : Écrivez et dessinez avec un stylo bleu
- **Gomme** : Effacez facilement vos dessins (taille augmentée par défaut : 25px)
- **Sélection rectangulaire** : Sélectionnez une zone et effacez-la d'un coup
- **Taille ajustable** : Contrôlez la taille du stylo (2-50px) et de la gomme (5-100px)
- **Effacer tout** : Bouton pour nettoyer complètement le tableau
- **Sauvegarde automatique** : Vos dessins sont sauvegardés automatiquement dans le navigateur
- **Support tactile** : Fonctionne sur mobile et tablette
- **Raccourcis clavier** : Navigation rapide avec le clavier
- **React.js** : Construit avec React 18 et Vite pour des performances optimales

## 🚀 Installation

1. Installez les dépendances :
```bash
npm install
```

2. Lancez le serveur de développement :
```bash
npm run dev
```

3. Ouvrez votre navigateur à l'adresse indiquée (généralement `http://localhost:5173`)

## 📦 Build pour production

```bash
npm run build
```

Le dossier `dist` contiendra les fichiers optimisés pour la production.

## 🎯 Utilisation

1. Utilisez le **stylo bleu** pour écrire et dessiner
2. Cliquez sur la **gomme** pour effacer (taille augmentée pour plus de rapidité)
3. Utilisez la **sélection rectangulaire** pour sélectionner une zone et l'effacer d'un coup
4. Ajustez la **taille** du stylo ou de la gomme avec le curseur selon l'outil actif
5. Cliquez sur **Effacer tout** pour nettoyer le tableau

## ⌨️ Raccourcis Clavier

- **P** : Activer le stylo bleu
- **E** : Activer la gomme
- **S** : Activer la sélection rectangulaire
- **Ctrl + Suppr** : Effacer tout le tableau
- **+** : Augmenter la taille de l'outil actif (stylo ou gomme)
- **-** : Diminuer la taille de l'outil actif (stylo ou gomme)

## 🎯 Parfait pour

- Résoudre des problèmes de programmation compétitive
- Dessiner des algorithmes et structures de données
- Prendre des notes visuelles
- Planifier des solutions
- Visualiser des problèmes complexes

## 💾 Sauvegarde

Vos dessins sont automatiquement sauvegardés dans le navigateur (localStorage) et restaurés lors de la prochaine ouverture.

## 🛠️ Technologies

- **React 18** : Bibliothèque UI moderne
- **Vite** : Build tool ultra-rapide
- **Canvas API** : Pour le dessin interactif

## 🌐 Compatibilité

- Chrome, Firefox, Safari, Edge (dernières versions)
- Mobile et tablette (support tactile)
- Responsive design

## 📁 Structure du projet

```
tableaublanc/
├── src/
│   ├── components/
│   │   ├── Whiteboard.jsx      # Composant principal du tableau blanc
│   │   └── Whiteboard.css      # Styles du tableau blanc
│   ├── App.jsx                 # Composant racine
│   ├── App.css                 # Styles de l'application
│   ├── main.jsx                # Point d'entrée React
│   └── index.css               # Styles globaux
├── index.html                  # HTML de base
├── package.json                # Dépendances npm
├── vite.config.js              # Configuration Vite
└── README.md                   # Ce fichier
```

---

Bon coding ! 🚀
