// Shared helpers
function getTooltip() {
  let t = d3.select("body").select("div.tooltip");
  if (t.empty()) {
    t = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  }
  return t;
}

// Flexible numeric parser
function parseNumber(value) {
  if (value == null) return NaN;
  const cleaned = String(value).replace(/,/g, "").trim();
  const n = +cleaned;
  return isNaN(n) ? NaN : n;
}

// Find a column whose header contains any of the given keywords
function findColumn(columns, ...keywords) {
  const lower = columns.map(c => c.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex(c => c.includes(kw.toLowerCase()));
    if (idx !== -1) return columns[idx];
  }
  return null;
}

/* ------------------------------------------------------------------
   1) Phoenix Water vs Population (1990–2019) – Indexed (1990 = 100)
   ------------------------------------------------------------------ */
   let phoenixWaterDrawn = false;
   function drawPhoenixWaterHistory() {
     if (phoenixWaterDrawn) return;
     phoenixWaterDrawn = true;
   
     const container = d3.select("#phoenix-water-history");
     if (container.empty()) return;
   
     const margin = { top: 32, right: 40, bottom: 80, left: 90 };
     const fullWidth = container.node().clientWidth || 800;
     const innerWidth = fullWidth - margin.left - margin.right;
     const innerHeight = 320;
   
     const svgRoot = container.append("svg")
       .attr("viewBox", `0 0 ${fullWidth} ${innerHeight + margin.top + margin.bottom}`)
       .attr("preserveAspectRatio", "xMidYMid meet");
   
     const svg = svgRoot.append("g")
       .attr("transform", `translate(${margin.left},${margin.top})`);
   
     d3.csv("datasets/Phoenix_WaterPopulation_1990_2019.csv").then(raw => {
       console.log("Water CSV columns:", raw.columns);
       console.log("First water row:", raw[0]);
   
       const yearCol  = findColumn(raw.columns, "year");
       const waterCol = findColumn(raw.columns, "water", "prod", "af");
       const popCol   = findColumn(raw.columns, "pop");
   
       if (!yearCol || !waterCol || !popCol) {
         console.warn("Could not find expected columns in water CSV:", raw.columns);
         return;
       }
   
       let data = raw.map(d => ({
         year:  parseNumber(d[yearCol]),
         water: parseNumber(d[waterCol]),
         pop:   parseNumber(d[popCol])
       })).filter(d => !isNaN(d.year) && !isNaN(d.water) && !isNaN(d.pop));
   
       if (!data.length) {
         console.warn("No valid Phoenix water data after parsing.");
         return;
       }
   
       // --- Build indices (1990 = 100) --------------------------------
       // Use first year in the data as the base (should be 1990)
       const base = data[0];
       const baseWater = base.water;
       const basePop   = base.pop;
   
       data.forEach(d => {
         d.idxWater = (d.water / baseWater) * 100;
         d.idxPop   = (d.pop   / basePop)   * 100;
       });
   
       // --- SCALES -----------------------------------------------------
       const x = d3.scaleLinear()
         .domain(d3.extent(data, d => d.year))
         .range([0, innerWidth]);
   
       const idxMin = d3.min(data, d => Math.min(d.idxWater, d.idxPop));
       const idxMax = d3.max(data, d => Math.max(d.idxWater, d.idxPop));
   
       const yIndex = d3.scaleLinear()
         .domain([Math.max(80, idxMin * 0.95), idxMax * 1.05])
         .nice()
         .range([innerHeight, 0]);
   
       // --- AXES -------------------------------------------------------
       svg.append("g")
         .attr("transform", `translate(0,${innerHeight})`)
         .call(d3.axisBottom(x).tickFormat(d3.format("d")));
   
       svg.append("g")
         .call(d3.axisLeft(yIndex).tickFormat(d3.format(".0f")));
   
       // Axis labels
       svg.append("text")
          .attr("x", innerWidth / 2)
          .attr("y", innerHeight + 30)
          .attr("text-anchor", "middle")
          .style("font-weight", "bold")
          .style("font-size", "14px")
          .style("fill", "#111827")
          .text("Year");
   
       svg.append("text")
         .attr("transform", "rotate(-90)")
         .attr("x", -innerHeight / 2)
         .attr("y", -60)
         .attr("text-anchor", "middle")
         .style("font-weight", "bold")
         .style("font-size", "16px")
         .text("Index (1990 = 100)");
   
       // --- CLIP PATH FOR SCROLL-REVEAL -------------------------------
       const clip = svg.append("clipPath")
         .attr("id", "phoenix-water-clip")
         .append("rect")
         .attr("x", 0)
         .attr("y", 0)
         .attr("width", 0)
         .attr("height", innerHeight);
   
       const plotGroup = svg.append("g")
         .attr("clip-path", "url(#phoenix-water-clip)");
   
       // --- INDEX LINES ------------------------------------------------
       const waterLine = d3.line()
         .x(d => x(d.year))
         .y(d => yIndex(d.idxWater))
         .curve(d3.curveMonotoneX);
   
       const popLine = d3.line()
         .x(d => x(d.year))
         .y(d => yIndex(d.idxPop))
         .curve(d3.curveMonotoneX);
   
       plotGroup.append("path")
         .datum(data)
         .attr("class", "series-water")
         .attr("fill", "none")
         .attr("stroke", "#1d4ed8")
         .attr("stroke-width", 3)
         .attr("d", waterLine);
   
       plotGroup.append("path")
         .datum(data)
         .attr("class", "series-pop")
         .attr("fill", "none")
         .attr("stroke", "#00eeffff")
         .attr("stroke-width", 3)
         .attr("d", popLine);
   
       // --- LEGEND (Low-key, top-right) -------------------------------
       const seriesVisible = { water: true, pop: true };
   
       const legend = svg.append("g")
         .attr("transform", `translate(${innerWidth - 190}, 10)`);
   
       legend.append("rect")
         .attr("width", 180)
         .attr("height", 60)
         .attr("fill", "white")
         .attr("stroke", "#d1d5db")
         .attr("rx", 8);
   
       const legendItems = [
         { key: "water", label: "Water index",   color: "#1d4ed8", y: 24 },
         { key: "pop",   label: "Population index", color: "#00eeffff", y: 42 }
       ];
   
       legendItems.forEach(item => {
         legend.append("line")
           .attr("x1", 14).attr("y1", item.y)
           .attr("x2", 44).attr("y2", item.y)
           .attr("stroke", item.color)
           .attr("stroke-width", 3);
   
         legend.append("text")
           .attr("x", 50).attr("y", item.y + 3)
           .style("font-size", "12px")
           .style("cursor", "pointer")
           .text(item.label)
           .on("click", event => {
             seriesVisible[item.key] = !seriesVisible[item.key];
             plotGroup.selectAll(".series-" + item.key)
               .style("opacity", seriesVisible[item.key] ? 1 : 0);
             d3.select(event.currentTarget)
               .style("opacity", seriesVisible[item.key] ? 1 : 0.35);
           });
       });
   
       // --- TOOLTIP DOTS & CROSSHAIR ----------------------------------
       const tooltip = getTooltip();
   
       const focusLine = plotGroup.append("line")
         .attr("y1", 0)
         .attr("y2", innerHeight)
         .attr("stroke", "#9ca3af")
         .attr("stroke-width", 1)
         .style("opacity", 0);
   
       const dotWater = plotGroup.append("circle")
         .attr("r", 4)
         .attr("fill", "#1d4ed8")
         .attr("stroke", "white")
         .attr("stroke-width", 1.5)
         .style("opacity", 0);
   
       const dotPop = plotGroup.append("circle")
         .attr("r", 4)
         .attr("fill", "#00eeffff")
         .attr("stroke", "white")
         .attr("stroke-width", 1.5)
         .style("opacity", 0);
   
       const bisectYear = d3.bisector(d => d.year).center;
   
       svg.append("rect")
         .attr("x", 0)
         .attr("y", 0)
         .attr("width", innerWidth)
         .attr("height", innerHeight)
         .attr("fill", "transparent")
         .style("cursor", "crosshair")
         .on("mousemove", (event) => {
           const [mx] = d3.pointer(event);
           const yr = x.invert(mx);
           const i = bisectYear(data, yr);
           const d = data[i];
           if (!d) return;
   
           const ratio = d.pop && d.water ? (d.water / (d.pop / 1000)) : null; // AF per 1k people
   
           focusLine
             .attr("x1", x(d.year))
             .attr("x2", x(d.year))
             .style("opacity", 0.9);
   
           dotWater
             .attr("cx", x(d.year))
             .attr("cy", yIndex(d.idxWater))
             .style("opacity", seriesVisible.water ? 1 : 0);
   
           dotPop
             .attr("cx", x(d.year))
             .attr("cy", yIndex(d.idxPop))
             .style("opacity", seriesVisible.pop ? 1 : 0);
   
           tooltip.style("opacity", 1)
             .html(`
               <strong>${d.year}</strong><br/>
               Water index: ${d.idxWater.toFixed(1)}<br/>
               Pop index: ${d.idxPop.toFixed(1)}<br/>
               <span style="font-size:11px;color:#4b5563;">
                 Water: ${d3.format(",")(d.water)} AF<br/>
                 Population: ${d3.format(",")(d.pop)}<br/>
                 ${ratio ? `~${d3.format(".1f")(ratio)} AF per 1,000 people` : ""}
               </span>
             `)
             .style("left", (event.pageX + 12) + "px")
             .style("top", (event.pageY - 40) + "px");
         })
         .on("mouseout", () => {
           focusLine.style("opacity", 0);
           dotWater.style("opacity", 0);
           dotPop.style("opacity", 0);
           tooltip.style("opacity", 0);
         });
   
       // --- SCROLL-DRIVEN REVEAL --------------------------------------
       function updateClipOnScroll() {
         const rect = container.node().getBoundingClientRect();
         const vh = window.innerHeight || document.documentElement.clientHeight;
   
         const start = vh * 0.2;
         const end = vh * 0.2 + rect.height;
         let t = (vh - rect.top - start) / (end - start);
   
         t = Math.max(0, Math.min(1, t));
         const eased = t * t * (3 - 2 * t); // smoothstep
   
         clip.attr("width", eased * innerWidth);
       }
   
       updateClipOnScroll();
       window.addEventListener("scroll", updateClipOnScroll);
     });
   }
   

/* ------------------------------------------------------------------
   2) Phoenix Population Projections (2015–2065)
   ------------------------------------------------------------------ */
   let phoenixProjDrawn = false;
   function drawPhoenixPopProjections() {
     if (phoenixProjDrawn) return;
     phoenixProjDrawn = true;
   
     const container = d3.select("#phoenix-pop-projections");
     if (container.empty()) return;
   
     // ---- Layout constants ----
     const marginMain = { top: 30, right: 40, bottom: 60, left: 80 };
     const mainHeight = 260;
   
     // give the mini chart a bit more room + gap
     const miniHeight    = 140;
     const gapMainToMini = 45;
     const baselineY     = 100; // where bars sit in mini chart
   
     const width     = container.node().clientWidth;
     const mainWidth = width - marginMain.left - marginMain.right;
   
     const totalHeight =
       marginMain.top +
       mainHeight +
       gapMainToMini +
       miniHeight +
       40; // extra padding at very bottom
   
     const svg = container.append("svg")
       .attr("viewBox", `0 0 ${width} ${totalHeight}`)
       .attr("preserveAspectRatio", "xMidYMid meet");
   
     const mainGroup = svg.append("g")
       .attr("transform", `translate(${marginMain.left},${marginMain.top})`);
   
     const miniGroup = svg.append("g")
       .attr(
         "transform",
         `translate(${marginMain.left},${marginMain.top + mainHeight + gapMainToMini})`
       );
   
     const colors = {
       low:  "#1304e4ff",
       med:  "#1d84d8ff",
       high: "#00eeffff",
     };
     const scenarioMeta = [
       { key: "low",  label: "Low",    color: colors.low  },
       { key: "med",  label: "Medium", color: colors.med  },
       { key: "high", label: "High",   color: colors.high },
     ];
     const fmtMillions = (n) => d3.format(".1f")(n / 1_000_000) + "M";
   
     d3.csv("datasets/Phoenix_PopulationProjections_2015_2065.csv").then((raw) => {
       console.log("Projection CSV columns:", raw.columns);
       console.log("First projection row:", raw[0]);
   
       const yearCol = findColumn(raw.columns, "year");
       const lowCol  = findColumn(raw.columns, "low");
       const medCol  = findColumn(raw.columns, "medium", "med", "reference", "ref");
       const highCol = findColumn(raw.columns, "high");
   
       if (!yearCol || !lowCol || !medCol || !highCol) {
         console.warn("Could not find expected columns in projections CSV:", raw.columns);
         return;
       }
   
       let data = raw.map(d => ({
         year: parseNumber(d[yearCol]),
         low:  parseNumber(d[lowCol]),
         med:  parseNumber(d[medCol]),
         high: parseNumber(d[highCol])
       })).filter(d => !isNaN(d.year));
   
       if (!data.length) {
         console.warn("No valid Phoenix projection data after parsing.");
         return;
       }
   
       const maxPop = d3.max(data, d => d.high) * 1.05;
   
       // ---- Main chart scales ----
       const x = d3.scaleLinear()
         .domain(d3.extent(data, d => d.year))
         .range([0, mainWidth]);
   
       const y = d3.scaleLinear()
         .domain([0, maxPop])
         .nice()
         .range([mainHeight, 0]);
   
       // ---- Axes + labels ----
       mainGroup.append("g")
         .attr("transform", `translate(0,${mainHeight})`)
         .call(d3.axisBottom(x).tickFormat(d3.format("d")));
   
       mainGroup.append("g")
         .call(d3.axisLeft(y).tickFormat(d3.format(",d")));
   
       mainGroup.append("text")
         .attr("x", -mainHeight / 2)
         .attr("y", -55)
         .attr("transform", "rotate(-90)")
         .attr("text-anchor", "middle")
         .style("font-weight", "bold")
         .text("Population");
   
       mainGroup.append("text")
         .attr("x", mainWidth / 2)
         .attr("y", mainHeight + 32)
         .attr("text-anchor", "middle")
         .style("font-weight", "bold")
         .text("Year");
   
       // ---- Uncertainty band + lines ----
       const area = d3.area()
         .x(d => x(d.year))
         .y0(d => y(d.low))
         .y1(d => y(d.high))
         .curve(d3.curveMonotoneX);
   
       const lineLow = d3.line()
         .x(d => x(d.year))
         .y(d => y(d.low))
         .curve(d3.curveMonotoneX);
   
       const lineMed = d3.line()
         .x(d => x(d.year))
         .y(d => y(d.med))
         .curve(d3.curveMonotoneX);
   
       const lineHigh = d3.line()
         .x(d => x(d.year))
         .y(d => y(d.high))
         .curve(d3.curveMonotoneX);
   
       mainGroup.append("path")
         .datum(data)
         .attr("fill", "#bfdbfe")
         .attr("opacity", 0.35)
         .attr("d", area);
   
       mainGroup.append("path")
         .datum(data)
         .attr("fill", "none")
         .attr("stroke", colors.low)
         .attr("stroke-width", 2.5)
         .attr("d", lineLow);
   
       mainGroup.append("path")
         .datum(data)
         .attr("fill", "none")
         .attr("stroke", colors.med)
         .attr("stroke-width", 3)
         .attr("d", lineMed);
   
       mainGroup.append("path")
         .datum(data)
         .attr("fill", "none")
         .attr("stroke", colors.high)
         .attr("stroke-width", 2.5)
         .attr("d", lineHigh);
   
       // ---- Legend (top-right) ----
       const legend = mainGroup.append("g")
         .attr("transform", `translate(${mainWidth - 140},10)`);
   
       legend.append("rect")
         .attr("width", 130)
         .attr("height", 60)
         .attr("rx", 6)
         .attr("fill", "white")
         .attr("stroke", "#e5e7eb");
   
       scenarioMeta.forEach((s, i) => {
         const g = legend.append("g")
           .attr("transform", `translate(10,${15 + i * 15})`);
   
         g.append("line")
           .attr("x1", 0).attr("y1", 0)
           .attr("x2", 20).attr("y2", 0)
           .attr("stroke", s.color)
           .attr("stroke-width", 3);
   
         g.append("text")
           .attr("x", 26).attr("y", 4)
           .style("font-size", "11px")
           .text(s.label);
       });
   
       // ---- Mini snapshot + lollipop bars ----
   
       // hint label
       miniGroup.append("text")
         .attr("x", 0)
         .attr("y", 16)
         .style("font-size", "10px")
         .style("fill", "#6b7280")
         .text("Population (approx.)");
   
       // snapshot label clearly between axis + bars
       const snapshotLabel = miniGroup.append("text")
         .attr("x", mainWidth / 2)
         .attr("y", baselineY - 85)
         .attr("text-anchor", "middle")
         .style("font-weight", "600")
         .style("font-size", "12px")
         .text("");
   
       const miniX = d3.scaleBand()
         .domain(scenarioMeta.map(d => d.key))
         .range([0, mainWidth])
         .padding(0.25);
   
       const miniY = d3.scaleLinear()
         .domain([0, maxPop])
         .range([baselineY, 40]);  // higher values closer to top
   
       // grey baseline aligned with labels
       miniGroup.append("line")
         .attr("x1", 0).attr("y1", baselineY)
         .attr("x2", mainWidth).attr("y2", baselineY)
         .attr("stroke", "#d1d5db")
         .attr("stroke-width", 1);
   
       // year caption safely below everything
       const miniYearLabel = miniGroup.append("text")
         .attr("x", mainWidth / 2)
         .attr("y", baselineY + 80)
         .attr("text-anchor", "middle")
         .style("font-size", "11px")
         .style("font-weight", "500")
         .text("");
   
       // bar groups
       const barGroups = miniGroup.selectAll("g.bar-group")
         .data(scenarioMeta)
         .enter()
         .append("g")
         .attr("class", "bar-group")
         .attr("transform", d => `translate(${miniX(d.key) + miniX.bandwidth()/2},0)`);
   
       const boxWidth = Math.min(110, miniX.bandwidth() * 0.8);
   
       barGroups.append("rect")
         .attr("class", "snap-bar")
         .attr("x", -boxWidth/2)
         .attr("y", baselineY)
         .attr("width", boxWidth)
         .attr("height", 0)
         .attr("rx", 10)
         .attr("fill", d => d.color)
         .attr("opacity", 0.9);
   
       barGroups.append("circle")
         .attr("class", "snap-dot")
         .attr("cx", 0)
         .attr("cy", baselineY)
         .attr("r", 5)
         .attr("fill", "white")
         .attr("stroke", d => d.color)
         .attr("stroke-width", 2);
   
       // value label – pulled up a bit more from snapshot text
       barGroups.append("text")
         .attr("class", "snap-value")
         .attr("x", 0)
         .attr("y", baselineY - 20)
         .attr("text-anchor", "middle")
         .style("font-size", "11px")
         .style("fill", "#111827")
         .text("");
   
       barGroups.append("text")
         .attr("class", "snap-label")
         .attr("x", 0)
         .attr("y", baselineY + 20)
         .attr("text-anchor", "middle")
         .style("font-size", "12px")
         .style("font-weight", "600")
         .text(d => d.label);
   
       function updateSnapshot(d) {
         snapshotLabel.text(`${d.year} snapshot (Low / Medium / High)`);
         miniYearLabel.text(`Year ${d.year}`);
   
         barGroups.each(function(s) {
           const g = d3.select(this);
           const value =
             s.key === "low" ? d.low :
             s.key === "med" ? d.med : d.high;
   
           const barTop    = miniY(value);
           const barHeight = baselineY - barTop;
   
           g.select("rect.snap-bar")
             .transition().duration(360)
             .attr("y", barTop)
             .attr("height", barHeight);
   
           g.select("circle.snap-dot")
             .transition().duration(360)
             .attr("cy", barTop);
   
           g.select("text.snap-value")
             .text(fmtMillions(value))
             .transition().duration(360)
             .attr("y", barTop - 20);
         });
       }
   
       // start with first year
       updateSnapshot(data[0]);
   
       // ---- Hover to sync snapshot ----
       const tooltip = getTooltip();
   
       const focusLine = mainGroup.append("line")
         .attr("stroke", "#9ca3af")
         .attr("stroke-width", 1)
         .attr("y1", 0)
         .attr("y2", mainHeight)
         .style("opacity", 0);
   
       mainGroup.append("rect")
         .attr("fill", "transparent")
         .attr("pointer-events", "all")
         .attr("width", mainWidth)
         .attr("height", mainHeight)
         .on("mousemove", (event) => {
           const [mx] = d3.pointer(event);
           const yr = x.invert(mx);
           const idx = d3.bisector(d => d.year).center(data, yr);
           const d = data[idx];
           if (!d) return;
   
           focusLine
             .attr("x1", x(d.year))
             .attr("x2", x(d.year))
             .style("opacity", 1);
   
           tooltip.style("opacity", 1)
             .html(
               `<strong>${d.year}</strong><br/>
                Low: ${d3.format(",")(d.low)}<br/>
                Medium: ${d3.format(",")(d.med)}<br/>
                High: ${d3.format(",")(d.high)}`
             )
             .style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 28) + "px");
   
           updateSnapshot(d);
         })
         .on("mouseout", () => {
           focusLine.style("opacity", 0);
           tooltip.style("opacity", 0);
         });
     });
   }
   

/* ------------------------------------------------------------------
   3) Phoenix Water Sources mini-Sankey (2015–2019 avg)
   ------------------------------------------------------------------ */
   let phoenixSourcesDrawn = false;
   function drawPhoenixWaterSources() {
     if (phoenixSourcesDrawn) return;
     phoenixSourcesDrawn = true;
   
     const container = d3.select("#phoenix-water-sankey");
     if (container.empty()) return;
   
     const detail = d3.select("#phoenix-sankey-detail");
   
     const containerWidth = container.node().clientWidth || 600;
     const margin = { top: 30, right: 20, bottom: 60, left: 10 };
     const width  = containerWidth - margin.left - margin.right;
     const height = 260;
   
     const svg = container.append("svg")
       .attr(
         "viewBox",
         `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`
       )
       .attr("preserveAspectRatio", "xMidYMid meet")
       .append("g")
       // small downward nudge for nicer centering
       .attr("transform", `translate(${margin.left},${margin.top + 5})`);
   
     // ----- Data -------------------------------------------------------
     const nodes = [
       { name: "SRP" },
       { name: "CAP" },
       { name: "Reclaimed water" },
       { name: "Groundwater" },
       { name: "City taps" },
       { name: "Parks & irrigation" },
       { name: "Cooling & industry" }
     ];
   
     const links = [
       { source: 0, target: 4, value: 36 },
       { source: 0, target: 5, value: 12 },
       { source: 0, target: 6, value: 4 },
   
       { source: 1, target: 4, value: 16 },
       { source: 1, target: 5, value: 14 },
       { source: 1, target: 6, value: 8 },
   
       { source: 2, target: 5, value: 6 },
       { source: 2, target: 6, value: 2 },
   
       { source: 3, target: 4, value: 1 },
       { source: 3, target: 6, value: 1 }
     ];
   
     const color = d3.scaleOrdinal()
       .domain(nodes.map(d => d.name))
       .range([
         "#386dffff", // SRP
         "#00fff2ff", // CAP
         "#22c55e", // Reclaimed
         "#489ad1ff", // Groundwater
         "#0f766e", // City taps (derived from teal)
         "#84cc16", // Parks
         "#ef4444"  // Cooling
       ]);
   
     const sankey = d3.sankey()
       .nodeWidth(14)
       .nodePadding(18)
       .extent([[0, 0], [width, height]]);
   
     const { nodes: graphNodes, links: graphLinks } = sankey({
       nodes: nodes.map(d => ({ ...d })),
       links: links.map(d => ({ ...d }))
     });
   
     // Node & link descriptions for the side panel
     const nodeDescriptions = {
       "SRP": `
         <strong>SRP (Salt River Project)</strong> brings Salt & Verde River water
         into Phoenix. It supplies the largest and most senior share of the city’s
         portfolio.`,
       "CAP": `
         <strong>CAP (Central Arizona Project)</strong> delivers Colorado River
         water hundreds of miles to central Arizona. It’s critical, but also the
         most exposed to shortage tiers.`,
       "Reclaimed water": `
         <strong>Reclaimed water</strong> is highly treated wastewater reused for
         cooling, industry, and irrigation, which reduces demand on drinking water.`,
       "Groundwater": `
         <strong>Groundwater</strong> is Phoenix’s emergency savings account,
         pumped carefully to avoid long-term aquifer decline.`,
       "City taps": `
         <strong>City taps</strong> represent potable water delivered to homes and
         businesses for everyday use.`,
       "Parks & irrigation": `
         <strong>Parks & irrigation</strong> covers golf courses, city parks,
         landscaping, and other outdoor irrigation.`,
       "Cooling & industry": `
         <strong>Cooling & industry</strong> includes power-plant cooling towers,
         data centers, and industrial customers that can often use reclaimed water.`
     };
   
     const linkDescriptions = d => `
       <strong>${d.source.name} → ${d.target.name}</strong><br/>
       Roughly ${d.value}% of Phoenix’s total water portfolio flows along this path
       in a typical 2015–2019 year.`;
   
     const tooltip = getTooltip();
   
     // ----- Links ------------------------------------------------------
     const defaultLinkOpacity = 0.65;
     const dimOpacity = 0.12;
   
     const link = svg.append("g")
       .attr("fill", "none")
       .selectAll("path")
       .data(graphLinks)
       .enter()
       .append("path")
       .attr("d", d3.sankeyLinkHorizontal())
       .attr("stroke", d => color(d.source.name))
       .attr("stroke-width", d => Math.max(1, d.width))
       .attr("stroke-opacity", 0)
       .attr("class", "sankey-link")
       .on("mouseover", (event, d) => {
         highlightLink(d);
         tooltip.style("opacity", 1)
           .html(linkDescriptions(d))
           .style("left", (event.pageX + 10) + "px")
           .style("top", (event.pageY - 24) + "px");
       })
       .on("mouseout", () => {
         resetHighlight();
         tooltip.style("opacity", 0);
       })
       .on("click", (event, d) => {
         detail.html(linkDescriptions(d));
         event.stopPropagation();
       });
   
     // simple fade-in animation
     link.transition()
       .duration(1800)
       .delay((d, i) => 150 + i * 40)
       .attr("stroke-opacity", defaultLinkOpacity);
   
     // ----- Nodes ------------------------------------------------------
     const node = svg.append("g")
       .selectAll("g.node")
       .data(graphNodes)
       .enter()
       .append("g")
       .attr("class", "sankey-node");
   
     const nodeRects = node.append("rect")
       .attr("x", d => d.x0)
       .attr("y", d => d.y0)
       .attr("height", d => Math.max(4, d.y1 - d.y0))
       .attr("width", d => d.x1 - d.x0)
       .attr("fill", d => color(d.name))
       .attr("rx", 3)
       .attr("ry", 3)
       .on("mouseover", (event, d) => {
         highlightNode(d.index);
         tooltip.style("opacity", 1)
           .html(nodeDescriptions[d.name] || `<strong>${d.name}</strong>`)
           .style("left", (event.pageX + 10) + "px")
           .style("top", (event.pageY - 24) + "px");
       })
       .on("mouseout", () => {
         resetHighlight();
         tooltip.style("opacity", 0);
       })
       .on("click", (event, d) => {
         detail.html(nodeDescriptions[d.name] || `<strong>${d.name}</strong>`);
         event.stopPropagation();
       });
   
     // Label with white halo for contrast
     node.append("text")
       .attr("class", "sankey-label")
       .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
       .attr("y", d => (d.y0 + d.y1) / 2)
       .attr("dy", "0.35em")
       .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
       .text(d => d.name);
   
     // ----- Caption under the diagram ---------------------------------
     svg.append("text")
       .attr("class", "sankey-caption")
       .attr("x", width / 2)
       .attr("y", height + 32)
       .attr("text-anchor", "middle")
   
     // ----- Highlight helpers -----------------------------------------
     function resetHighlight() {
       link.style("stroke-opacity", defaultLinkOpacity);
       nodeRects.style("opacity", 1);
     }
   
     function highlightNode(nodeIndex) {
       link.style("stroke-opacity", d =>
         d.source.index === nodeIndex || d.target.index === nodeIndex
           ? defaultLinkOpacity
           : dimOpacity
       );
       nodeRects.style("opacity", d => (d.index === nodeIndex ? 1 : 0.45));
     }
   
     function highlightLink(linkDatum) {
       link.style("stroke-opacity", d =>
         d === linkDatum ? defaultLinkOpacity : dimOpacity
       );
       nodeRects.style("opacity", d =>
         d.index === linkDatum.source.index || d.index === linkDatum.target.index
           ? 1
           : 0.45
       );
     }
   
     // Clicking empty space resets + clears detail text back to tip
     svg.on("click", () => {
       resetHighlight();
       detail.html(
         `<strong>Tip:</strong> Hover a flow to see how much of
          Phoenix’s water moves from each source (left) to each type of use (right).
          Click a node or flow for a short explanation.`
       );
     });
   }
   

/* ------------------------------------------------------------------
   4) Lake Mead Storage Area Chart (1980–2025) – scroll-linked reveal
------------------------------------------------------------------ */
let lakeMeadDrawn = false;
function drawLakeMeadStorage() {
  if (lakeMeadDrawn) return;
  lakeMeadDrawn = true;

  const container = d3.select("#lake-mead-storage");
  if (container.empty()) return;

  const margin = { top: 40, right: 40, bottom: 60, left: 90 };
  const width  = container.node().clientWidth - margin.left - margin.right;
  const height = 360 - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  d3.csv("datasets/LakeMead_Storage_1980_2025.csv", d => ({
    year: +d.Year,
    storage: +d.Storage_AF
  })).then(data => {
    data = data.filter(d => !isNaN(d.year) && !isNaN(d.storage));

    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.year))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.storage) * 1.1])
      .nice()
      .range([height, 0]);

    const maxStorage = d3.max(data, d => d.storage);
    const tiers = [
      { name: "Comfort zone",  min: 20_000_000, max: maxStorage, color: "rgba(22,163,74,0.12)" },
      { name: "Warning",       min: 15_000_000, max: 20_000_000, color: "rgba(234,179,8,0.18)" },
      { name: "Shortage risk", min: 0,          max: 15_000_000, color: "rgba(239,68,68,0.20)" }
    ];

    svg.selectAll("rect.tier-band")
      .data(tiers)
      .enter()
      .append("rect")
      .attr("class", "tier-band")
      .attr("x", 0)
      .attr("width", width)
      .attr("y", d => y(d.max))
      .attr("height", d => y(d.min) - y(d.max))
      .attr("fill", d => d.color);

    const area = d3.area()
      .x(d => x(d.year))
      .y0(height)
      .y1(d => y(d.storage))
      .curve(d3.curveMonotoneX);

    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.storage))
      .curve(d3.curveMonotoneX);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
      .call(d3.axisLeft(y).tickFormat(d3.format(",d")));

    // Labels
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 45)
      .attr("text-anchor", "middle")
      .style("font-weight", "bold")
      .text("Year");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -70)
      .attr("text-anchor", "middle")
      .style("font-weight", "bold")
      .text("Storage (Acre-feet)");

    // --- ClipPath driven by scroll progress ---
    const clipRect = svg.append("clipPath")
      .attr("id", "lake-mead-clip")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 0)          // start hidden
      .attr("height", height);

    svg.append("path")
      .datum(data)
      .attr("clip-path", "url(#lake-mead-clip)")
      .attr("fill", "#bfdbfe")
      .attr("stroke", "none")
      .attr("d", area);

    svg.append("path")
      .datum(data)
      .attr("clip-path", "url(#lake-mead-clip)")
      .attr("fill", "none")
      .attr("stroke", "#1d4ed8")
      .attr("stroke-width", 2.5)
      .attr("d", line);

    // --- Tooltip + crosshair + tier label ---
    const tooltip = getTooltip();

    const focusLine = svg.append("line")
      .attr("class", "focus-line")
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#4b5563")
      .attr("stroke-width", 1)
      .style("opacity", 0);

    const focusDot = svg.append("circle")
      .attr("class", "focus-dot")
      .attr("r", 4)
      .attr("fill", "#1d4ed8")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5)
      .style("opacity", 0);

    const tierLabel = svg.append("text")
      .attr("x", width)
      .attr("y", -10)
      .attr("text-anchor", "end")
      .style("font-size", "12px")
      .style("fill", "#374151")
      .text("");

    const bisectYear = d3.bisector(d => d.year).center;

    svg.append("rect")
      .attr("class", "hover-capture")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "transparent")
      .style("cursor", "crosshair")
      .on("mousemove", (event) => {
        const [mx] = d3.pointer(event);
        const yr = x.invert(mx);
        const i = bisectYear(data, yr);
        const d = data[i];
        if (!d) return;

        const tier = tiers.find(t => d.storage >= t.min && d.storage <= t.max);

        focusLine
          .attr("x1", x(d.year))
          .attr("x2", x(d.year))
          .style("opacity", 1);

        focusDot
          .attr("cx", x(d.year))
          .attr("cy", y(d.storage))
          .style("opacity", 1);

        tierLabel.text(tier ? tier.name : "");

        tooltip.style("opacity", 1)
          .html(`
            <strong>${d.year}</strong><br/>
            Storage: ${d3.format(",")(d.storage)} AF<br/>
            <span style="color:#ef4444;font-weight:600;">
              ${tier ? tier.name : ""}
            </span>
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        focusLine.style("opacity", 0);
        focusDot.style("opacity", 0);
        tierLabel.text("");
        tooltip.style("opacity", 0);
      });

    // Tier legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 170}, 10)`);

    const legendItems = [
      { name: "Comfort zone",  color: "rgba(22,163,74,0.6)" },
      { name: "Warning",       color: "rgba(234,179,8,0.8)" },
      { name: "Shortage risk", color: "rgba(239,68,68,0.8)" }
    ];

    legend.append("rect")
      .attr("width", 160)
      .attr("height", 65)
      .attr("fill", "white")
      .attr("stroke", "#e5e7eb")
      .attr("rx", 6);

    legend.selectAll("g.item")
      .data(legendItems)
      .enter()
      .append("g")
      .attr("class", "item")
      .attr("transform", (d, i) => `translate(10,${18 + i * 15})`)
      .each(function(d) {
        const g = d3.select(this);
        g.append("rect")
          .attr("width", 10)
          .attr("height", 10)
          .attr("fill", d.color);
        g.append("text")
          .attr("x", 16)
          .attr("y", 9)
          .style("font-size", "11px")
          .text(d.name);
      });

    // Tiny caption
    svg.append("text")
      .attr("x", width)
      .attr("y", height + 55)
      .attr("text-anchor", "end")
      .style("font-size", "11px")
      .style("fill", "#6b7280")
      .text("Flow reveals as you scroll: shaded bands mark comfort, warning, and shortage risk zones.");

    /* -------- Scroll-linked reveal logic ---------- */

    // Find the enclosing scroll-trigger section for this chart
    const section = container.node().closest(".scroll-trigger");

    function updateReveal() {
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;

      // Progress ~0 when section just enters, ~1 when it's fully in view.
      const start = vh;          // start revealing when top hits 20% down
      const end   = vh * 0.4;          // fully revealed when top reaches 80% up

      let progress = (vh - rect.top - start) / (vh + rect.height - (start + (vh - end)));
      progress = Math.max(0, Math.min(1, progress));  // clamp [0,1]

      clipRect.attr("width", progress * width);
    }

    // Initial call + scroll listener
    updateReveal();
    window.addEventListener("scroll", updateReveal, { passive: true });
  });
}

/* ------------------------------------------------------------------
   Shrinking Colorado River – curvy S-ribbon with diversions
   ------------------------------------------------------------------ */

   let shrinkingRiverDrawn = false;
   function drawShrinkingRiver() {
     if (shrinkingRiverDrawn) return;
     shrinkingRiverDrawn = true;
   
     const container = d3.select("#shrinking-river");
     if (container.empty()) return;
   
     const margin = { top: 40, right: 40, bottom: 70, left: 40 };
     const width  = container.node().clientWidth  - margin.left - margin.right;
     const height = 420 - margin.top - margin.bottom;
   
     const svg = container.append("svg")
       .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
       .attr("preserveAspectRatio", "xMidYMid meet")
       .append("g")
       .attr("transform", `translate(${margin.left},${margin.top})`);
   
     // ------------------------------------------------------------------
     // 1) River centerline points (S-curve) + width at each station
     //    y goes from top (source) to bottom (after losses)
     // ------------------------------------------------------------------
     const riverPoints = [
       {
         y: 10,
         x: width * 0.35,
         w: 130,
         label: "Total river flow ≈14.6 MAF",
         anchor: "start",
         dx: 10,
         dy: 6
       },
       {
         y: height * 0.30,
         x: width * 0.30,
         w: 110,
         label: "After Lower Basin & CA ≈9.0 MAF",
         anchor: "start",
         dx: 12,
         dy: 4
       },
       {
         y: height * 0.55,
         x: width * 0.40,
         w: 80,
         label: "Upper Basin share ≈1.8 MAF",
         anchor: "start",
         dx: 12,
         dy: 4
       },
       {
         y: height * 0.90,
         x: width * 0.33,
         w: 40,
         label: "River left after major losses",
         anchor: "middle",
         dx: 0,
         dy: 22
       }
     ];
   
     // Area generator: builds a ribbon around the centerline
     const riverArea = d3.area()
       .x0(d => d.x - d.w / 2)
       .x1(d => d.x + d.w / 2)
       .y(d => d.y)
       .curve(d3.curveCatmullRom.alpha(0.9));
   
     // Draw river ribbon
     svg.append("path")
       .datum(riverPoints)
       .attr("fill", "#bfdbfe")
       .attr("stroke", "#2563eb")
       .attr("stroke-width", 3)
       .attr("d", riverArea);
   
     // ------------------------------------------------------------------
     // 2) River labels along the ribbon
     // ------------------------------------------------------------------
     svg.selectAll(".river-label")
       .data(riverPoints)
       .enter()
       .append("text")
       .attr("class", "river-label")
       .attr("x", d => d.x + d.dx)
       .attr("y", d => d.y + d.dy)
       .attr("text-anchor", d => d.anchor)
       .style("font-weight", d => d.anchor === "middle" ? 700 : 600)
       .style("font-size", d => d.anchor === "middle" ? "14px" : "13px")
       .style("fill", "#111827")
       .text(d => d.label);
   
     // ------------------------------------------------------------------
     // 3) Side “pipes” (diversions), curving out of the river
     // ------------------------------------------------------------------
     const pipeLine = d3.line()
       .curve(d3.curveCatmullRom.alpha(0.8));
   
     // Helper to build a nice curved pipe path
     function makePipe(startX, startY, endX, endY) {
       const midX = (startX + endX) / 2;
       const ctrlOffset = (endX - startX) * 0.35;
       return [
         [startX, startY],
         [midX - ctrlOffset, startY - 18],
         [midX + ctrlOffset, endY + 10],
         [endX, endY]
       ];
     }
   
     const pipes = [
       {
         key: "lower-basin",
         label: "Lower Basin + CA ≈10.0 MAF",
         // tap off near the second river point
         attach: riverPoints[1],
         thickness: 24,
         endX: width * 0.85,
         endY: riverPoints[1].y + 4
       },
       {
         key: "agriculture",
         label: "Agriculture ≈4–5 MAF",
         attach: riverPoints[2],
         thickness: 22,
         endX: width * 0.80,
         endY: riverPoints[2].y + 8
       }
     ];
   
     const pipeGroup = svg.append("g").attr("class", "river-pipes");
   
     const pipeSel = pipeGroup.selectAll("g.pipe")
       .data(pipes)
       .enter()
       .append("g")
       .attr("class", d => "pipe pipe-" + d.key);
   
     // Draw each pipe as a thick rounded stroke
     pipeSel.each(function(d) {
       const g = d3.select(this);
       const sx = d.attach.x + d.attach.w / 2;   // right edge of river
       const sy = d.attach.y;
   
       const pathData = makePipe(sx, sy, d.endX, d.endY);
   
       // subtle underlay for softness
       g.append("path")
         .attr("d", pipeLine(pathData))
         .attr("fill", "none")
         .attr("stroke", "#fed7aa")
         .attr("stroke-width", d.thickness + 6)
         .attr("stroke-linecap", "round")
         .attr("stroke-linejoin", "round");
   
       // main orange pipe
       g.append("path")
         .attr("d", pipeLine(pathData))
         .attr("fill", "none")
         .attr("stroke", "#fb923c")
         .attr("stroke-width", d.thickness)
         .attr("stroke-linecap", "round")
         .attr("stroke-linejoin", "round");
     });
   
     // Pipe labels
     pipeSel.append("text")
       .attr("x", d => d.endX + 8)
       .attr("y", d => d.endY + 4)
       .attr("text-anchor", "start")
       .style("font-weight", 700)
       .style("font-size", "13px")
       .style("fill", "#111827")
       .text(d => d.label);
   
     // ------------------------------------------------------------------
     // 4) Caption at the bottom
     // ------------------------------------------------------------------
     svg.append("rect")
       .attr("x", 0)
       .attr("y", height + 18)
       .attr("width", width)
       .attr("height", 32)
       .attr("fill", "#f3f4f6");
   
     svg.append("text")
       .attr("x", width / 2)
       .attr("y", height + 39)
       .attr("text-anchor", "middle")
       .style("font-size", "12px")
       .style("fill", "#4b5563")
       .text("Flow width is proportional to remaining Colorado River water (~14.6 MAF). Side “pipes” show major diversions (values approximate, for storytelling).");
   }
   