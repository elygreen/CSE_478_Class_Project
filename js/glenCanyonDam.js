// Load CSV with error handling
d3.csv("datasets/lakePowellStorage.csv").then(data => {
    console.log("Lake Powell data loaded:", data.length, "rows");
    
    // Convert numeric fields
    data.forEach(d => {
        d.datetime = new Date(d.datetime);
        d.storage = +d.storage;
    });

    // Chart dimensions
    const width = 900;
    const height = 450;
    const margin = { top: 40, right: 40, bottom: 110, left: 80 };

    // Create SVG
    const svg = d3
        .select("#glen-canyon-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("style", "max-width: 100%; height: auto;");

    // Scales
    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.datetime))
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.storage)])
        .nice()
        .range([height - margin.bottom, margin.top]);

    // Line generator
    const line = d3.line()
        .x(d => x(d.datetime))
        .y(d => y(d.storage))
        .curve(d3.curveMonotoneX);

    // Add gradient
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "lake-gradient")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "0%")
        .attr("y2", "100%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#3b82f6")
        .attr("stop-opacity", 0.4);

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#1d4ed8")
        .attr("stop-opacity", 0.1);

    // Area generator for fill
    const area = d3.area()
        .x(d => x(d.datetime))
        .y0(height - margin.bottom)
        .y1(d => y(d.storage))
        .curve(d3.curveMonotoneX);

    // Draw filled area
    svg.append("path")
        .datum(data)
        .attr("fill", "url(#lake-gradient)")
        .attr("d", area);

    // Draw line
    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#1d4ed8")
        .attr("stroke-width", 2.5)
        .attr("d", line);

    // X axis
    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(x)
            .ticks(10)
            .tickFormat(d3.timeFormat("%Y")))
        .style("font-size", "12px");

    // Y axis with better formatting
    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(y)
            .ticks(8)
            .tickFormat(d => {
                // Format as millions with commas
                const millions = d / 1000000;
                return millions.toFixed(1).replace(/\.0$/, '') + "M AF";
            }))
        .style("font-size", "12px");

    // Add axis labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 75)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .text("Year");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height / 2))
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .text("Storage (Acre-Feet)");

    svg.append("text")
            .attr("x", width / 2)
            .attr("y", margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .style("fill", "#1e3a8a")
            .text("Lake Powell Water Storage");

    // Add hover interaction
    const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.9)")
        .style("color", "white")
        .style("padding", "10px 14px")
        .style("border-radius", "6px")
        .style("font-size", "13px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", "9999")
        .style("box-shadow", "0 2px 8px rgba(0,0,0,0.3)");

    // Add invisible overlay for hover
    const bisect = d3.bisector(d => d.datetime).left;

    svg.append("rect")
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", width - margin.left - margin.right)
        .attr("height", height - margin.top - margin.bottom)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("mousemove", function(event) {
            const [mouseX] = d3.pointer(event);
            const x0 = x.invert(mouseX);
            const i = bisect(data, x0);
            const d = data[i];
            
            if (d) {
                tooltip
                    .style("opacity", 1)
                    .html(`
                        <strong>${d3.timeFormat("%B %Y")(d.datetime)}</strong><br/>
                        Storage: ${(d.storage / 1000000).toFixed(2)}M AF
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });

}).catch(error => {
    console.error("Error loading Lake Powell data:", error);
    d3.select("#glen-canyon-chart")
        .append("div")
        .style("padding", "20px")
        .style("color", "red")
        .text("Error loading chart data.");
});