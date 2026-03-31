# 3D-Portfolio
3D portfolio med React och ThreeJS


Examensarbete PM

Syftet med detta PM är att kort och koncist beskriva bakgrund, syfte och mål med ens examensarbete. Delvis för att se att det finns en rimlig avvägning av vad man hinner med under kursens examensarbete och för att stämma av att det du sa att du skulle leverera till slutet av kursen är det som lämnas in. Läs igenom kursmålen nedan för att få en överblick av vad som ska examineras så du reflekterar över dessa mål när du bestämmer ditt examensarbete.

Kursmål

Efter fullföljd kurs ska den studerande ha kunskaper i/ om:

1. Agila arbetsmetoder
2. Projekt och kodhantering med Git
3. Vikten av projektavstämningar, målbild och att hålla deadlines
4. Hur opponering av annans examensarbete planeras och genomförs
Efter fullföljd kurs ska den studerande ha färdigheter i (att):
5. Versionshantering
6. Planering och utveckling av ett webbprojekt efter branschens krav
7. Granska och ge feedback på annans examensarbete
Efter fullföljd kurs ska den studerande ha kompetens att:
8. Självständigt planera, genomföra och utvärdera ett webbprojekt efter branschens krav 
9. Granska och opponera på annans examensarbete

Introduktion

Namn: Andrei Manea

Klass: Frontend Distans

Bakgrund

Jag vill skapa en 3D baserad portfolio som kombinerar mina tre största kompetensområden: UX design, frontend utveckling och 3d modellering. Idén växte fram ur en önskan att presentera mitt arbete på ett mer interaktivt och upplevelsebaserat sätt än en traditionell portfolio. Genom att använda 3d miljöer kan jag visa både min tekniska förmåga och min visuella design kompetens i ett sammanhängande koncept.

Syfte

Syftet med projektet är att utveckla ett modernt, experimentellt och användarvänligt portfolio gränssnitt som sticker ut och visar vem jag är som designer och utvecklare. Jag vill demonstrera min förmåga att skapa engagerande digitala upplevelser, samt visa att jag behärskar både klassiska frontend verktyg och mer avancerade tekniker som 3dgrafik i webbläsaren.

Mål och planering

Mål 

- Skapa en fungerande webbapplikation där användaren kan navigera i en enkel 3D miljö.
- Integrera interaktiva element som presenterar mina projekt, t.ex. animerade klickbara objekt eller UI paneler.
- Implementera en tydlig UX struktur som gör upplevelsen intuitiv
- Bygga en responsiv layout som fungerar på desktop och mobil 
- Optimera 3D modeller för webben (låg polygonräkning, komprimerade texturer)
- Dokumentera arbetsprocessen och motivera designval

Planering / Arbetsmetod

- Jag kommer att använda GitHub Projects för att strukturera uppgifter, deadlines och features.
-  Arbetet delas upp i sprint liknande faser: 
	Fas 1 - Målformulering
		- Definiera syfte och mål
		- inspiration och referens analys
	Fas 2 - UX
		- skisser / wireframes
		- User flow
		- UI / navigation
	Fas 3 – 3D Miljö
		- Sätta upp projektstruktur och repo
		- Göra alla 3D modeller
		- Grundläggande 3D scen
		- Testa kamera, ljus, kontroller
	Fas 4 -  Interaktiva element
		- Koppling mellan 3D objekt och UI med ThreeJS
		- UI paneler som visar prjektinformation
		- Övriga animationer
	Fas 5 – Optimering och responsvitet
		- Optimering av kod och 3D modeller (låg polygonräckning)
		- Laddningstid och FPS
		- Responsivitet – Mobil och Desktop


- Git trategi: feature ranches för varje delmoment, pull requests till main eller dev när funktioner är klara. Projektet kommer att planera och genomföra med hjälp av Kanban i GitHub Projects för att tillämpa agila arbetsmetoder och möjliggöra kontinuerlig uppföljning.


Kravspecifikation - Funktionalitet

Webbplatsen kommer att innehålla följande funktionalitet och sektioner:

Huvudfunktioner:

1. 3D Navigationsmiljö
   - En interaktiv 3D scen där användaren kan navigera med mus/tangentbord eller touch (mobil)
   - Kamerakontroller som tillåter rotation, zoom och panning
   - Enkel och intuitiv navigation som fungerar på både desktop och mobil

2. Projektvisning
   - Interaktiva 3D objekt i scenen som representerar olika projekt
   - Klickbara objekt som öppnar detaljerade projektpaneler
   - Projektpaneler som visar:
     - Projektbeskrivning och syfte
     - Teknisk stack som användes
     - Bildgalleri eller visuella exempel
     - Länkar till live-demo eller GitHub-repository
   - Animationer när objekt väljs/interageras med

3. Om mig-sektion
   - Informationspanel som presenterar min bakgrund och kompetenser
   - Visuell representation av mina färdigheter (UX design, Frontend, 3D modellering)
   - Kontaktinformation och länkar till sociala medier/LinkedIn

4. UI-komponenter och navigation
   - Huvudmeny/navigationsmeny för att hoppa mellan sektioner
   - Loading-skärm med progressindikator när 3D-modeller laddas
   - Responsiva UI-paneler som överlagras på 3D-scenen
   - Smooth transitions och animationer mellan olika vyer

5. Responsiv design
   - Optimerad visning för desktop (1920px och nedåt)
   - Mobilversion med touch-kontroller för 3D-navigation
   - Anpassad UI-layout för olika skärmstorlekar
   - Fallback-lösningar om 3D-rendering inte stöds

6. Prestanda och optimering
   - Lazy loading av 3D-modeller för snabbare initial laddning
   - Optimering av polygonräkning och texturstorlekar
   - Målsättning: 60 FPS på desktop, minst 30 FPS på mobil
   - Progressiv laddning med visuell feedback

7. Interaktiva element
   - Hover-effekter på 3D-objekt som visar att de är klickbara
   - Animerade övergångar när projektpaneler öppnas/stängs
   - Scroll-animationer för att synkronisera 2D-innehåll med 3D-scenen
   - Eventuellt: Ljudeffekter för ökad immersion (valfritt)

Tekniska krav:

- Webbplatsen ska vara en Single Page Application (SPA)
- Alla 3D-modeller ska vara optimerade för webben (GLTF/GLB-format)
- Stöd för moderna webbläsare (Chrome, Firefox, Safari, Edge)
- SEO-optimerad med meta-taggar och semantisk HTML
- Tillgänglighet: Keyboard navigation och ARIA-labels där relevant


Tekniker

Jag planerar att använda följande tech stack
- React – komponenter och UI logik
- Three.js – för att rendera 3D miljöer direkt i webbläsaren
- HTML5, CSS, JavaScript – grundläggande webbutveckling
- Figma – UX skisser och prototyper
- Blender – skapa och optimera 3D modeller
- Git – versionhantering

Eventuellt kan jag använda

- React Three Fiber – för att förenkla integrationen mellan React och Three.js
- GSAP eller Framer Motion – för animationer
- Firebase eller Supabase – om jag vill lägga någon form av backend längre fram

Files and their purpose

src/Scene.jsx
The 3D world for the project - ground plane, lights, HDRI sky, the island model, the character, click-to-move, and the orbit camera. 

src/Island.jsx
Loads the island GLB 3D model, scales and centers it, replaces Blender’s water mesh with animated water (I initially made the water in Blender, it used an animated shader, however, I had A LOT of issues trying to import that into threejs), marks meshes for obstacles and clickable popups, adds collision boxes around certain objects (mostly house and palm trees)

src/Character.jsx
Loads the character GLB, scales and places it, plays walk/idle animations, moves toward the click target on the ground, snaps feet to terrain, and respects obstacle boxes from the island.

src/CharacterOrbitCamera.jsx
Camera that orbits around the character at a fixed distance (isometric). Middle mouse / two-finger drag rotates; left click stays free for “walk” instead of rotating the view.

src/ClickToMove.jsx
A small helper that only exists so the click-handling hook runs inside the React Three Fiber Canvas

src/hooks/useClickToMove.js
Turns mouse/touch clicks into a 3D raycast: if you hit an interactive prop, it opens the right side panel or link; otherwise it sets the walk target on the ground

src/interactionConfig.js
Maps Blender object names (book, github, giraffe, linkedin) to side-panel IDs. 

src/islandConfig.js
One constant: the URL/path of the island GLB file so you we can re-export the scene and reload it into the project. Had to do that many times, in order to move things around.

src/spawnPoint.js
Helper that finds the small boat in the island scene and returns a spawn position near it so the character doesn’t start inside a rock or tree. Still not working properly.

src/context/PanelContext.jsx
React context for panel and functions to open/close it. 

src/SidePanel.jsx
The actual slide-out panel: text, images, close button, and Escape key should work to close