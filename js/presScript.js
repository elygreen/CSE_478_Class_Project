document.addEventListener("DOMContentLoaded", () => {
  const width = 800;
  const height = 600;

  const container = d3.select("#map-container");
  container.selectAll("*").remove();

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

 
  Promise.all([
    d3.json("assets/states.geojson"),
    d3.json("assets/basin_upper.geojson"),
    d3.json("assets/basin_lower.geojson"),
    d3.json("assets/colorado_main.geojson"),
    d3.json("assets/colorado_tributaries.geojson"),
    d3.csv("datasets/Colorado_River_Water_Allocation.csv")
  ])
    .then(([statesData, upperBasin, lowerBasin, mainRiver, tribs, csvData]) => {
      

      // Parse CSV data into drought tiers 
      const droughtTiers = {};
      csvData.forEach(row => {
        const tier = row.Drought_Tier || "";
        const stateName = row.State;
        const allotment = parseFloat(row.Allotment);
        const allocation = parseFloat(row.Allocation);
        
        
        if (!droughtTiers[tier]) {
          droughtTiers[tier] = {};
        }
        
        droughtTiers[tier][stateName] = {
          max: allotment,
          current: allocation
        };
        
        // Add Mexico == Sonora and Baja California
        if (stateName === "Mexico") {
          droughtTiers[tier]["Sonora"] = {
            max: allotment,
            current: allocation
          };
          droughtTiers[tier]["Baja California"] = {
            max: allotment,
            current: allocation
          };
        }
      });

      // tierKeys array: ["", "0", "1", "2", "2.5", "3", "4"] for le drought
      const tierKeys = Object.keys(droughtTiers).sort((a, b) => {
        if (a === "") return -1;
        if (b === "") return 1;
        return parseFloat(a) - parseFloat(b);
      });

      console.log("Drought tiers available:", tierKeys);
      console.log("Drought tier data:", droughtTiers);

      //starts with first tier (no drought)
      let currentTierData = droughtTiers[tierKeys[0]];

      // Projection based on states
      const projection = d3.geoMercator().fitSize([width, height], statesData);
      const path = d3.geoPath().projection(projection);

      // gradients definition
      const defs = svg.append("defs");

      // State detail panel
      let selectedState = null;
      const detailPanel = d3.select("#map-container")
        .append("div")
        .attr("class", "state-detail-panel")
        .style("position", "absolute")
        .style("right", "20px")
        .style("top", "50%")
        .style("transform", "translateY(-50%)")
        .style("width", "350px")
        .style("max-height", "150vh")
        .style("overflow-y", "auto")
        .style("background", "white")
        .style("padding", "20px")
        .style("border-radius", "8px")
        .style("box-shadow", "0 4px 6px rgba(0,0,0,0.1)")
        .style("opacity", "0")
        .style("pointer-events", "none")
        .style("transition", "opacity 0.3s ease");

      
      const statesGroup = svg.append("g").attr("class", "states");

      const states = statesGroup
        .selectAll("path")
        .data(statesData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("id", (d) => {
          const postal = d.properties.postal || d.properties.name;
          return `state-${postal.replace(/\s+/g, "-")}`;
        })
        .attr("fill", (d) => {
          const stateName = d.properties.name;
          const postal = d.properties.postal;
          
          // check if state has actual data
          const data = currentTierData[stateName] || currentTierData[postal];
          
          if (data) {
            const percentage = (data.current / data.max) * 100;
            
            //gradient ID per state
            const gradientId = `gradient-${(postal || stateName).replace(/\s+/g, "-")}`; //clean data, get rid of spaces for id
            
            //linear gradient 
            const gradient = defs.append("linearGradient")
              .attr("id", gradientId)
              .attr("x1", "0%")
              .attr("y1", "100%")  // started from bottom
              .attr("x2", "0%")
              .attr("y2", "0%");   
            
            // Filled portion (blue)
            gradient.append("stop")
              .attr("offset", "0%")
              .attr("stop-color", "#3b82f6") 
              .attr("stop-opacity", 1);
            
            gradient.append("stop")
              .attr("offset", `${percentage}%`)
              .attr("stop-color", "#3b82f6")
              .attr("stop-opacity", 1);
            
            // Empty portion (light gray)
            gradient.append("stop")
              .attr("offset", `${percentage}%`)
              .attr("stop-color", "#e5e7eb")  
              .attr("stop-opacity", 1);
            
            gradient.append("stop")
              .attr("offset", "100%")
              .attr("stop-color", "#e5e7eb")
              .attr("stop-opacity", 1);
            
            return `url(#${gradientId})`;
          }
          
          return "#e5e7eb"; 
        })
        .attr("stroke", "#111827")
        .attr("stroke-width", 1.5)
        .each(function (d) {
          const stateName = d.properties.name;
          const postal = d.properties.postal;
          const data = currentTierData[stateName] || currentTierData[postal];
          
          if (data) {
            const percentage = ((data.current / data.max) * 100).toFixed(1);
            d3.select(this).attr("data-percentage", percentage);
            d3.select(this).attr("data-current", data.current);
            d3.select(this).attr("data-max", data.max);
          }
        });

      // Add text labels for allocation values
      const labelsGroup = svg.append("g").attr("class", "state-labels");
      
      const labels = labelsGroup
        .selectAll("text")
        .data(statesData.features)
        .enter()
        .append("text")
        .attr("class", "allocation-label")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("pointer-events", "none")
        .attr("fill", "#1f2937")
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .style("text-shadow", "0 0 3px white, 0 0 3px white, 0 0 3px white")
        .attr("x", d => {
          const centroid = path.centroid(d);
          return centroid[0];
        })
        .attr("y", d => {
          const centroid = path.centroid(d);
          return centroid[1];
        })
        .text(d => {
          const stateName = d.properties.name;
          const postal = d.properties.postal;
          
          // Only show label on Sonora, not Baja California 
          if (stateName === "Baja California" || postal === "BC") {
            return "";
          }
          
          const data = currentTierData[stateName] || currentTierData[postal];
          return data ? data.current.toFixed(2) : "";
        });

      

      // state hover
      states
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
          // Don't apply hover if a state is selected
          if (selectedState) return;
          
          const el = d3.select(this);
          el.raise(); // bring this state above other states (basins/rivers still stay on top)

          const bbox = this.getBBox();
          const cx = bbox.x + bbox.width / 2;
          const cy = bbox.y + bbox.height / 2;

          el.transition()
            .duration(150)
            .attr(
              "transform",
              `translate(${cx},${cy}) scale(1.05) translate(${-cx},${-cy})`
            );

          el.attr("stroke", "#000000").attr("stroke-width", 3);
        })
        .on("mouseout", function (event, d) {
          // Don't reset hover  if a state is selected
          if (selectedState) return;
          
          const el = d3.select(this);

          el.transition()
            .duration(150)
            .attr("transform", "none");

          el.attr("stroke", "#111827").attr("stroke-width", 1.5);
        })
        .on("click", function (event, d) {
          const percentage = d3.select(this).attr("data-percentage");
          const current = d3.select(this).attr("data-current");
          const max = d3.select(this).attr("data-max");
          
          handleStateClick(d, this, percentage, current, max);
        });

      // handle state click and detail view
      function handleStateClick(stateData, element, percentage, current, max) {
        const stateName = stateData.properties.name;
        
        // If clicking the same state, close it
        if (selectedState === stateName) {
          closeStateDetail();
          return;
        }
        
        // Close previous state if any
        if (selectedState) {
          closeStateDetail();
        }
        
        selectedState = stateName;
        const el = d3.select(element);
        const bbox = element.getBBox();
        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;
        
        // Disable pointer events on this state during transition
        el.style("pointer-events", "none");
        
        // Hide all other states
        statesGroup.selectAll("path")
          .filter(d => d.properties.name !== stateName)
          .style("display", "none");
        
        // Hide all other labels
        labelsGroup.selectAll("text")
          .filter(d => d.properties.name !== stateName)
          .style("display", "none");
        
        // Hide basins and rivers
        basinsGroup.style("display", "none");
        riversGroup.style("display", "none");
        
        // Get the label for this state
        const stateLabel = labelsGroup.selectAll("text")
          .filter(d => d.properties.name === stateName);
        
        // target for state to go to when transitioning
        const targetX = 150;
        const targetY = height / 3;
        
        // Calculate translation 
        const translateX = targetX - cx;
        const translateY = targetY - cy;
        
        // Scale up and move
        el.raise()
          .transition()
          .duration(600)
          .ease(d3.easeCubicOut)
          .attr("transform", `translate(${translateX},${translateY}) scale(1.5)`)
          .on("end", function() {
            // Show detail panel after animation completes
            showDetailPanel(stateName, percentage, current, max);
          });
        
        // Move label with state
        stateLabel
          .transition()
          .duration(600)
          .ease(d3.easeCubicOut)
          .attr("transform", `translate(${translateX},${translateY}) scale(1.5)`);
      }
      
      // State-specific descriptions
      const stateDescriptions = {
        "Arizona": "In the event of a shortage, Arizona's allocation may be reduced by up to 21% depending on the drought tier. These cuts affect CAP first, which supplies water to Phoenix and Tucson.",
        "California": "California has senior water rights to the Colorado River, which means it has priority over other lower basin states in times of shortage. This shortage falls to mostly Arizona, who takes a majority of the cuts.",
        "Nevada": "Nevada's allocation from the Colorado River is relatively small compared to other states, but it is crucial for supplying water to Las Vegas and surrounding areas.",
        "New Mexico": "New Mexico's allocation from the Colorado River is relatively small compared to other states, but it is crucial for supplying water to its agricultural regions and communities in the northwest part of the state.",
        "Colorado": "Colorado, as an upper basin state, is not directly affected by the drought tiers in terms of allocation cuts. However, it plays a crucial role in managing water resources and ensuring compliance with interstate compacts.",
        "Utah": "Utah, as an upper basin state, is not directly affected by the drought tiers in terms of allocation cuts. However, it plays a crucial role in managing water resources and ensuring compliance with interstate compacts.",
        "Wyoming": "Wyoming, as an upper basin state, is not directly affected by the drought tiers in terms of allocation cuts. However, it plays a crucial role in managing water resources and ensuring compliance with interstate compacts.",
        "Sonora": "Sonora, Mexico, relies on its allocation from the Colorado River for agricultural and municipal use. In times of shortage, Mexico's allocation may be reduced proportionally based on the drought tier.",
        "Baja California": "Baja California, Mexico, relies on its allocation from the Colorado River for agricultural and municipal use. In times of shortage, Mexico's allocation may be reduced proportionally based on the drought tier."
      };
      
      // Function to show detail panel with state information
      function showDetailPanel(stateName, percentage, current, max) {
        const tier = document.getElementById("tier-label").textContent;
        const description = stateDescriptions[stateName] || "Information about this state's water usage and allocation.";
        
        detailPanel.html(`
          <h3 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #1f2937;">
            ${stateName}
          </h3>
          <div style="margin-bottom: 0.75rem;">
            <span style="font-weight: 600; color: #4b5563;">Drought Tier:</span>
            <span style="color: #2563eb;">${tier}</span>
          </div>
          <div style="margin-bottom: 0.75rem;">
            <span style="font-weight: 600; color: #4b5563;">Allocation:</span>
            <span>${current} MAF</span>
          </div>
          <div style="margin-bottom: 0.75rem;">
            <span style="font-weight: 600; color: #4b5563;">Allotment:</span>
            <span>${max} MAF</span>
          </div>
          <div style="margin-bottom: 1rem;">
            <span style="font-weight: 600; color: #4b5563;">Fill Level:</span>
            <span>${percentage}%</span>
          </div>
          <div style="margin-bottom: 1rem; padding: 0.75rem; background-color: #f3f4f6; border-radius: 0.375rem; font-size: 0.875rem; line-height: 1.5; color: #374151;">
            ${description}
          </div>
          <button 
            id="close-detail" 
            style="width: 100%; padding: 0.5rem; background-color: #2563eb; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-weight: 600;"
          >
            Close
          </button>
        `);
        
        detailPanel
          .style("opacity", "1")
          .style("pointer-events", "auto");
        
        // Add close button handler
        detailPanel.select("#close-detail").on("click", closeStateDetail);
      }
      
      // Function to close state detail view
      function closeStateDetail() {
        if (!selectedState) return;
        
        const currentSelectedState = selectedState;
        selectedState = null;
        
        // Show all states and labels
        statesGroup.selectAll("path").style("display", null);
        labelsGroup.selectAll("text").style("display", null);
        
        // Show basins and rivers only if they were visible before
        if (basinsVisible) {
          basinsGroup.style("display", null);
        }
        if (riversVisible) {
          riversGroup.style("display", null);
        }
        
        // Hide panel first
        detailPanel
          .transition()
          .duration(300)
          .style("opacity", "0")
          .on("end", function() {
            d3.select(this).style("pointer-events", "none");
          });
        
        // Reset state transform and re-enable pointer events
        statesGroup.selectAll("path")
          .filter(d => d.properties.name === currentSelectedState)
          .transition()
          .duration(600)
          .ease(d3.easeCubicInOut)
          .attr("transform", "none")
          .on("end", function() {
            // Re-enable pointer events after transition
            statesGroup.style("pointer-events", "auto");
            // Re-enable pointer events on the individual state
            d3.select(this).style("pointer-events", "auto");
          });
        
        // Reset label transform
        labelsGroup.selectAll("text")
          .filter(d => d.properties.name === currentSelectedState)
          .transition()
          .duration(600)
          .ease(d3.easeCubicInOut)
          .attr("transform", "none");
      }

      // Function to update state fills based on current tier data
      function updateStateFills() {
        states.each(function(d) {
          const stateName = d.properties.name;
          const postal = d.properties.postal;
          const data = currentTierData[stateName] || currentTierData[postal];
          
          if (data) {
            const percentage = (data.current / data.max) * 100;
            
            // Update data attributes
            d3.select(this)
              .attr("data-percentage", percentage.toFixed(1))
              .attr("data-current", data.current)
              .attr("data-max", data.max);
            
            // gradient update
            const gradientId = `gradient-${(postal || stateName).replace(/\s+/g, "-")}`;
            const gradient = defs.select(`#${gradientId}`);
            
            if (gradient.empty()) return;
            
            // gradient stops with transitions
            const stops = gradient.selectAll("stop").data([
              { offset: "0%", color: "#3b82f6", opacity: 1 },
              { offset: `${percentage}%`, color: "#3b82f6", opacity: 1 },
              { offset: `${percentage}%`, color: "#e5e7eb", opacity: 1 },
              { offset: "100%", color: "#e5e7eb", opacity: 1 }
            ]);
            
            stops.enter()
              .append("stop")
              .merge(stops)
              .transition()
              .duration(800)
              .ease(d3.easeCubicInOut)
              .attr("offset", d => d.offset)
              .attr("stop-color", d => d.color)
              .attr("stop-opacity", d => d.opacity);
            
            stops.exit().remove();
          }
        });
        
        // Update text labels
        labels.transition()
          .duration(800)
          .ease(d3.easeCubicInOut)
          .tween("text", function(d) {
            const stateName = d.properties.name;
            const postal = d.properties.postal;
            
            // Skip Baja California label so its centered in sonora
            if (stateName === "Baja California" || postal === "BC") {
              return;
            }
            
            const data = currentTierData[stateName] || currentTierData[postal];
            
            if (!data) return;
            
            const el = d3.select(this);
            const oldValue = parseFloat(el.text()) || 0;
            const newValue = data.current;
            const interpolate = d3.interpolateNumber(oldValue, newValue);
            
            return function(t) {
              el.text(interpolate(t).toFixed(2));
            };
          });
      }

      // slider listener
      const slider = document.getElementById("drought-slider");
      if (slider) {
        slider.addEventListener("input", (e) => {
          const tierIndex = parseInt(e.target.value);
          const tier = tierKeys[tierIndex];
          
          // Update current tier data
          currentTierData = droughtTiers[tier];
          console.log("Current tier data:", currentTierData);
          
          // Update tier label
          const tierLabel = document.getElementById("tier-label");
          if (tierLabel) {
            tierLabel.textContent = tier === "" ? "No Drought" : `Tier ${tier}`;
          }
          
          // Update state filled with new tier data
          updateStateFills();
        });
      }

      // BASINS ON TOP ( MADE non-clickable)
      const basinsGroup = svg.append("g")
        .attr("class", "basins")
        .style("pointer-events", "none"); 

      if (upperBasin && upperBasin.features) {
        basinsGroup
          .selectAll(".upper-basin")
          .data(upperBasin.features)
          .enter()
          .append("path")
          .attr("class", "upper-basin")
          .attr("d", path)
          .attr("fill", "#bfdbfe")      
          .attr("fill-opacity", 0.4)
          .attr("stroke", "#1d4ed8")
          .attr("stroke-width", 1.5);
      }

      if (lowerBasin && lowerBasin.features) {
        basinsGroup
          .selectAll(".lower-basin")
          .data(lowerBasin.features)
          .enter()
          .append("path")
          .attr("class", "lower-basin")
          .attr("d", path)
          .attr("fill", "#fee2e2")      
          .attr("fill-opacity", 0.35)
          .attr("stroke", "#b91c1c")
          .attr("stroke-width", 1.5);
      }

      // RIVERS ON TOP ( MADE non-clickable)
      const riversGroup = svg.append("g")
        .attr("class", "rivers")
        .style("pointer-events", "none"); 

      if (tribs && tribs.features) {
        riversGroup
          .selectAll(".trib")
          .data(tribs.features)
          .enter()
          .append("path")
          .attr("class", "trib")
          .attr("d", path)
          .attr("fill", "none")
          .attr("stroke", "#60a5fa")   
          .attr("stroke-width", 1)
          .attr("stroke-linecap", "round");
      }

      if (mainRiver && mainRiver.features) {
        riversGroup
          .selectAll(".main-river")
          .data(mainRiver.features)
          .enter()
          .append("path")
          .attr("class", "main-river")
          .attr("d", path)
          .attr("fill", "none")
          .attr("stroke", "#2563eb")   
          .attr("stroke-width", 3)
          .attr("stroke-linecap", "round");
      }

      // Toggle buttons
      let basinsVisible = true;
      let riversVisible = true;

      const toggleBasinsBtn = document.getElementById("toggle-basins");
      if (toggleBasinsBtn) {
        toggleBasinsBtn.addEventListener("click", () => {
          basinsVisible = !basinsVisible;
          basinsGroup.style("display", basinsVisible ? "block" : "none");
          toggleBasinsBtn.textContent = basinsVisible ? "Hide Basins" : "Show Basins";
        });
      }

      const toggleRiversBtn = document.getElementById("toggle-rivers");
      if (toggleRiversBtn) {
        toggleRiversBtn.addEventListener("click", () => {
          riversVisible = !riversVisible;
          riversGroup.style("display", riversVisible ? "block" : "none");
          toggleRiversBtn.textContent = riversVisible ? "Hide Rivers" : "Show Rivers";
        });
      }

    })
    .catch((err) => {
      console.error("Error loading geojson:", err);
    });
});