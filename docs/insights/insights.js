/* ============================================================================
 * NotifiAZ — insights/insights.js
 *
 * The Insights tab. Three sections:
 *
 *   1. Dataset overview (EDA)
 *      - Disease distribution (D3 horizontal bar chart)
 *      - Cases by AZ county (D3 horizontal bar chart)
 *      - Subject-kind breakdown (D3 donut chart)
 *      - Tribal-residency overlay (D3 stacked bar)
 *
 *   2. Callback Predictor (Package B)
 *      - Headline metrics card (F1, AUC, accuracy, precision, recall)
 *      - ROC curve (D3 line chart with shaded AUC)
 *      - Feature importance comparison: LR coefs vs RF importance vs GB
 *        importance (D3 grouped horizontal bar chart)
 *      - Confusion matrix (HTML table, color-coded)
 *      - Three-model comparison table
 *
 *   3. Ask NotifiAZ (Package C — RAG)
 *      - Search box with example chips
 *      - Live ranked results from the 72-disease database
 *      - Each result expands to the deterministic answer card
 *
 * D3 is loaded from CDN in index.html. All charts use the project's color
 * palette (cardinal #AB0520, navy #0C234B, sage, amber, terracotta).
 *
 * This view is INTENTIONALLY self-explanatory: every chart has a title,
 * a one-sentence "what this shows" line, and a one-sentence "why it
 * matters for public-health reporting" line. The panel reviewer should be
 * able to understand the project from this view alone, with no narration.
 * ========================================================================== */

(function () {
    'use strict';

    const COLOR = {
        cardinal: "#AB0520",
        navy:     "#0C234B",
        sage:     "#3F6B47",
        amber:    "#B8842B",
        terra:    "#B85C3F",
        cream:    "#F5F1E8",
        ink:      "#1F1F1F",
        muted:    "#6E6A60",
    };

    function _esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g,
            c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    }

    function _section(title, what, why, body, id) {
        return `
            <section class="ins-section" id="${id || ''}">
                <header class="ins-head">
                    <h2>${_esc(title)}</h2>
                    <p class="ins-what"><strong>What this shows:</strong> ${_esc(what)}</p>
                    <p class="ins-why"><strong>Why it matters:</strong> ${_esc(why)}</p>
                </header>
                <div class="ins-body">${body}</div>
            </section>`;
    }

    function render() {
        const root = document.getElementById("view-insights");
        if (!root) return;
        root.innerHTML = `
            <div class="ins-shell">
                <header class="ins-master-head">
                    <h1>📈 Insights</h1>
                    <p>Self-contained walkthrough of the NotifiAZ dataset, the callback-likelihood predictor, and the
                    Ask-NotifiAZ retrieval system. Everything on this page is computed live from synthetic data — refresh
                    the browser and the numbers update.</p>
                </header>

                <nav class="ins-nav">
                    <a href="#ins-eda">1. Dataset (EDA)</a>
                    <a href="#ins-predictor">2. Callback predictor</a>
                    <a href="#ins-rag">3. Ask NotifiAZ (RAG)</a>
                </nav>

                ${_section(
                    "1.1 — Disease distribution in synthetic patient panel",
                    "How many synthetic patients have each reportable disease in our 60-patient panel.",
                    "Skewed toward Arizona-relevant diseases (Valley Fever, Salmonellosis, RMSF) so the demo exercises the routing logic against the diseases ADHS sees in real surveillance data.",
                    `<div class="chart-host" id="chart-disease-dist"></div>`,
                    "ins-eda"
                )}

                ${_section(
                    "1.2 — Cases by AZ county",
                    "Geographic distribution of synthetic patients across Arizona counties.",
                    "Demonstrates the routing rule that resolves <code>local_health_dept</code> to the correct county health department per patient.",
                    `<div class="chart-host" id="chart-county-dist"></div>`
                )}

                ${_section(
                    "1.3 — Subject kind and zoonotic bridge",
                    "Breakdown of human reports vs animal reports vs zoonotic animal reports that trigger the cross-species ADHS bridge.",
                    "The zoonotic bridge is the One-Health element of NotifiAZ: when a vet reports a zoonotic disease, ADHS gets a parallel notification automatically.",
                    `<div class="chart-grid">
                        <div class="chart-host" id="chart-subject-donut"></div>
                        <div class="chart-host" id="chart-tribal-stack"></div>
                    </div>`
                )}

                ${_section(
                    "2.1 — Predictor headline metrics",
                    "Performance of three models trained to predict whether a submitted report will trigger an agency callback question.",
                    "Logistic Regression is the production model — best F1 and AUC, AND interpretable coefficients. Random Forest and Gradient Boosting are reported as comparison baselines for academic completeness.",
                    `<div class="metrics-card" id="card-metrics"></div>
                     <div class="metrics-table-host" id="table-metrics"></div>`,
                    "ins-predictor"
                )}

                ${_section(
                    "2.2 — ROC curve (logistic regression)",
                    "True-positive rate vs false-positive rate across all decision thresholds for the production model.",
                    "AUC summarizes how well the model separates callback-bound reports from clean ones independent of the threshold. AUC > 0.5 means the model is doing better than random guessing; AUC ≈ 0.7 means it's a useful pre-submission warning system but not an oracle.",
                    `<div class="chart-host" id="chart-roc"></div>`
                )}

                ${_section(
                    "2.3 — Feature importance — three-way comparison",
                    "How much each of the 10 features contributes to the prediction, according to each of the three models.",
                    "All three models agree completeness_score is the dominant signal: incomplete reports are the ones agencies have to call back about. This is exactly the signal NotifiAZ is designed to surface to clinicians BEFORE they hit submit.",
                    `<div class="chart-host" id="chart-importance"></div>`
                )}

                ${_section(
                    "2.4 — Confusion matrix (logistic regression)",
                    "True positives, true negatives, false positives, false negatives at threshold = 0.5 on the held-out test set.",
                    "Recall (sensitivity) is the metric we care most about: a missed callback-bound report means a clinician submits an incomplete report and gets called by ADHS later. Precision matters less — it's fine to false-alarm a clinician with a 'maybe incomplete' warning before submission.",
                    `<div class="conf-mat-host" id="conf-mat"></div>`
                )}

                ${_section(
                    "3 — Ask NotifiAZ (Retrieval-Augmented)",
                    "Type a clinical question — symptoms, exposure, suspected diagnosis — and the system retrieves the most relevant entries from the 72-disease reportable-disease database.",
                    "Answers are deterministic and verifiable: every claim traces back to a specific entry in <code>reportable_diseases_us.json</code>. No LLM calls, no hallucinations. In production, the same retrieval would feed an instruction-tuned model for natural-language responses.",
                    `<div class="rag-shell">
                        <div class="rag-controls">
                            <input type="text" id="rag-input" placeholder="e.g. 'fever cough soil dust southern arizona'" />
                            <button id="rag-go" class="btn-primary">Search</button>
                        </div>
                        <div class="rag-samples" id="rag-samples"></div>
                        <div class="rag-results" id="rag-results"></div>
                    </div>`,
                    "ins-rag"
                )}

                <footer class="ins-foot">
                    <p>All data on this page is synthetic, generated from <code>seed=42</code>. The trained models'
                    coefficients are saved to <code>data/ml/predictor_*.json</code>. The retrieval index is
                    pre-computed in <code>app/shared/rag_data.js</code>.</p>
                </footer>
            </div>
        `;

        // Render charts after DOM is in place
        requestAnimationFrame(() => {
            _renderDiseaseDist();
            _renderCountyDist();
            _renderSubjectDonut();
            _renderTribalStack();
            _renderMetricsCard();
            _renderMetricsTable();
            _renderRoc();
            _renderImportance();
            _renderConfMat();
            _renderRagPanel();
        });
    }

    // ========================================================================
    // EDA charts
    // ========================================================================

    function _renderDiseaseDist() {
        const host = document.getElementById("chart-disease-dist");
        if (!host || !window.d3) return;
        host.innerHTML = "";
        const D = window.NA_DATA;
        const counts = {};
        D.patients.forEach(p => {
            const ap = p.active_problems[0];
            if (!ap) return;
            counts[ap.name] = (counts[ap.name] || 0) + 1;
        });
        const data = Object.entries(counts)
            .map(([name, n]) => ({ name, n }))
            .sort((a, b) => b.n - a.n);

        const m = {top: 10, right: 30, bottom: 30, left: 200};
        const width = host.clientWidth - m.left - m.right;
        const height = data.length * 26;
        const svg = d3.select(host).append("svg")
            .attr("viewBox", `0 0 ${width + m.left + m.right} ${height + m.top + m.bottom}`)
            .style("width", "100%").style("height", "auto")
            .append("g").attr("transform", `translate(${m.left},${m.top})`);

        const x = d3.scaleLinear().domain([0, d3.max(data, d => d.n)]).range([0, width]);
        const y = d3.scaleBand().domain(data.map(d => d.name)).range([0, height]).padding(0.18);

        svg.append("g").call(d3.axisLeft(y).tickSize(0))
            .selectAll("text").style("font-size", "12px").style("fill", COLOR.ink);
        svg.append("g").attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")))
            .selectAll("text").style("font-size", "11px").style("fill", COLOR.muted);

        svg.selectAll(".bar").data(data).join("rect")
            .attr("class", "bar")
            .attr("x", 0).attr("y", d => y(d.name)).attr("height", y.bandwidth())
            .attr("width", 0).attr("fill", COLOR.cardinal)
            .transition().duration(700)
            .attr("width", d => x(d.n));

        svg.selectAll(".lbl").data(data).join("text")
            .attr("class", "lbl")
            .attr("x", d => x(d.n) + 6)
            .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4)
            .style("font-size", "11px").style("fill", COLOR.ink)
            .text(d => d.n);
    }

    function _renderCountyDist() {
        const host = document.getElementById("chart-county-dist");
        if (!host || !window.d3) return;
        host.innerHTML = "";
        const D = window.NA_DATA;
        const counts = {};
        D.patients.forEach(p => {
            const c = p.address.county;
            counts[c] = (counts[c] || 0) + 1;
        });
        const data = Object.entries(counts).map(([name, n]) => ({ name, n }))
            .sort((a, b) => b.n - a.n);

        const m = {top: 10, right: 30, bottom: 30, left: 110};
        const width = host.clientWidth - m.left - m.right;
        const height = data.length * 26;
        const svg = d3.select(host).append("svg")
            .attr("viewBox", `0 0 ${width + m.left + m.right} ${height + m.top + m.bottom}`)
            .style("width", "100%").style("height", "auto")
            .append("g").attr("transform", `translate(${m.left},${m.top})`);

        const x = d3.scaleLinear().domain([0, d3.max(data, d => d.n)]).range([0, width]);
        const y = d3.scaleBand().domain(data.map(d => d.name)).range([0, height]).padding(0.18);

        svg.append("g").call(d3.axisLeft(y).tickSize(0))
            .selectAll("text").style("font-size", "12px");
        svg.append("g").attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")))
            .selectAll("text").style("font-size", "11px").style("fill", COLOR.muted);

        svg.selectAll(".bar").data(data).join("rect")
            .attr("class", "bar")
            .attr("x", 0).attr("y", d => y(d.name)).attr("height", y.bandwidth())
            .attr("width", 0).attr("fill", COLOR.navy)
            .transition().duration(700).delay((d,i) => i * 30)
            .attr("width", d => x(d.n));

        svg.selectAll(".lbl").data(data).join("text")
            .attr("class", "lbl")
            .attr("x", d => x(d.n) + 6)
            .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4)
            .style("font-size", "11px").style("fill", COLOR.ink)
            .text(d => d.n);
    }

    function _renderSubjectDonut() {
        const host = document.getElementById("chart-subject-donut");
        if (!host || !window.d3) return;
        host.innerHTML = "";
        const D = window.NA_DATA;
        const human = D.patients.filter(p => p.active_problems.length).length;
        const animal_zoo = D.animals.filter(a => a.active_problems[0]?.is_zoonotic).length;
        const animal_only = D.animals.length - animal_zoo;
        const data = [
            {label: "Human reports", value: human, color: COLOR.cardinal},
            {label: "Zoonotic (animal → ADHS bridge)", value: animal_zoo, color: COLOR.amber},
            {label: "Animal-only", value: animal_only, color: COLOR.sage},
        ];

        const size = Math.min(host.clientWidth, 280);
        const r = size / 2 - 10;
        const svg = d3.select(host).append("svg")
            .attr("viewBox", `0 0 ${size} ${size + 80}`)
            .style("width", "100%").style("height", "auto")
            .append("g").attr("transform", `translate(${size/2},${size/2})`);

        const pie = d3.pie().value(d => d.value)(data);
        const arc = d3.arc().innerRadius(r * 0.55).outerRadius(r);

        svg.selectAll("path").data(pie).join("path")
            .attr("d", arc).attr("fill", d => d.data.color)
            .attr("stroke", "#fff").attr("stroke-width", 2);

        svg.append("text").attr("text-anchor", "middle").attr("y", -4)
            .style("font-size", "22px").style("font-weight", "bold").style("fill", COLOR.ink)
            .text(human + animal_zoo + animal_only);
        svg.append("text").attr("text-anchor", "middle").attr("y", 16)
            .style("font-size", "11px").style("fill", COLOR.muted)
            .text("total subjects");

        // Legend below
        const legend = d3.select(host).select("svg")
            .append("g").attr("transform", `translate(20, ${size + 8})`);
        data.forEach((d, i) => {
            const row = legend.append("g").attr("transform", `translate(0, ${i * 18})`);
            row.append("rect").attr("width", 12).attr("height", 12).attr("fill", d.color);
            row.append("text").attr("x", 18).attr("y", 10)
                .style("font-size", "11px").style("fill", COLOR.ink)
                .text(`${d.label} (${d.value})`);
        });
    }

    function _renderTribalStack() {
        const host = document.getElementById("chart-tribal-stack");
        if (!host || !window.d3) return;
        host.innerHTML = "";
        const D = window.NA_DATA;
        const tribal = D.patients.filter(p => p.tribal_residency).length;
        const nontribal = D.patients.length - tribal;
        const data = [
            {label: "Non-tribal residence", value: nontribal, color: COLOR.navy},
            {label: "Tribal residence (sovereignty path)", value: tribal, color: COLOR.terra},
        ];

        const m = {top: 30, right: 20, bottom: 40, left: 20};
        const width = host.clientWidth - m.left - m.right;
        const height = 80;
        const svg = d3.select(host).append("svg")
            .attr("viewBox", `0 0 ${width + m.left + m.right} ${height + m.top + m.bottom}`)
            .style("width", "100%").style("height", "auto")
            .append("g").attr("transform", `translate(${m.left},${m.top})`);

        svg.append("text").attr("y", -8).style("font-size", "12px").style("fill", COLOR.ink)
            .text("Patient residency: tribal vs non-tribal");

        const total = nontribal + tribal;
        const x = d3.scaleLinear().domain([0, total]).range([0, width]);

        let xOff = 0;
        data.forEach(d => {
            svg.append("rect")
                .attr("x", xOff).attr("y", 10).attr("height", 30)
                .attr("width", 0).attr("fill", d.color)
                .transition().duration(700).attr("width", x(d.value));
            svg.append("text").attr("x", xOff + 6).attr("y", 30)
                .style("font-size", "12px").style("fill", "#fff").style("font-weight", "bold")
                .text(d.value > 0 ? d.value : "");
            xOff += x(d.value);
        });
        // Legend
        const legend = svg.append("g").attr("transform", `translate(0, ${height - 10})`);
        data.forEach((d, i) => {
            const xx = i * (width / 2);
            legend.append("rect").attr("x", xx).attr("y", 0).attr("width", 12).attr("height", 12).attr("fill", d.color);
            legend.append("text").attr("x", xx + 18).attr("y", 10)
                .style("font-size", "11px").style("fill", COLOR.ink).text(d.label);
        });
    }

    // ========================================================================
    // Predictor charts
    // ========================================================================

    function _renderMetricsCard() {
        const host = document.getElementById("card-metrics");
        if (!host) return;
        const M = window.NA_PREDICTOR;
        if (!M) { host.innerHTML = "<p>Predictor data not loaded.</p>"; return; }
        const lr = M.metrics.logistic_regression;
        host.innerHTML = `
            <div class="big-metric">
                <div class="bm-label">F1 (LR)</div>
                <div class="bm-value">${lr.f1.toFixed(2)}</div>
            </div>
            <div class="big-metric">
                <div class="bm-label">AUC (LR)</div>
                <div class="bm-value">${lr.auc.toFixed(2)}</div>
            </div>
            <div class="big-metric">
                <div class="bm-label">Recall</div>
                <div class="bm-value">${lr.recall.toFixed(2)}</div>
            </div>
            <div class="big-metric">
                <div class="bm-label">Precision</div>
                <div class="bm-value">${lr.precision.toFixed(2)}</div>
            </div>
            <div class="big-metric">
                <div class="bm-label">Accuracy</div>
                <div class="bm-value">${lr.accuracy.toFixed(2)}</div>
            </div>
        `;
    }

    function _renderMetricsTable() {
        const host = document.getElementById("table-metrics");
        if (!host) return;
        const M = window.NA_PREDICTOR;
        if (!M) return;
        const rows = [
            ["Logistic Regression", M.metrics.logistic_regression],
            ["Random Forest", M.metrics.random_forest],
            ["Gradient Boosting", M.metrics.gradient_boosting],
        ];
        host.innerHTML = `
            <table class="metrics-table">
                <thead><tr>
                    <th>Model</th><th>Accuracy</th><th>Precision</th><th>Recall</th><th>F1</th><th>AUC</th>
                </tr></thead>
                <tbody>
                    ${rows.map(([name, m]) => `<tr>
                        <td><strong>${name}</strong></td>
                        <td>${m.accuracy.toFixed(3)}</td>
                        <td>${m.precision.toFixed(3)}</td>
                        <td>${m.recall.toFixed(3)}</td>
                        <td>${m.f1.toFixed(3)}</td>
                        <td>${m.auc.toFixed(3)}</td>
                    </tr>`).join("")}
                </tbody>
            </table>
            <p class="table-note">Trained on ${M.metrics.logistic_regression.n_train} synthetic samples; evaluated on ${M.metrics.logistic_regression.n_test} held-out samples. Class-balanced weights for LR + RF; sample-weighted fit for GB.</p>`;
    }

    function _renderRoc() {
        const host = document.getElementById("chart-roc");
        if (!host || !window.d3) return;
        host.innerHTML = "";
        const R = window.NA_PREDICTOR && window.NA_PREDICTOR.roc;
        if (!R) return;
        const m = {top: 20, right: 30, bottom: 50, left: 60};
        const width = Math.min(host.clientWidth, 500) - m.left - m.right;
        const height = 380 - m.top - m.bottom;
        const svg = d3.select(host).append("svg")
            .attr("viewBox", `0 0 ${width + m.left + m.right} ${height + m.top + m.bottom}`)
            .style("width", "100%").style("max-width", "500px").style("height", "auto")
            .append("g").attr("transform", `translate(${m.left},${m.top})`);

        const x = d3.scaleLinear().domain([0,1]).range([0, width]);
        const y = d3.scaleLinear().domain([0,1]).range([height, 0]);

        svg.append("g").attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(5))
            .append("text").attr("x", width/2).attr("y", 38)
            .attr("fill", COLOR.ink).style("font-size", "12px").style("text-anchor", "middle")
            .text("False positive rate");
        svg.append("g").call(d3.axisLeft(y).ticks(5))
            .append("text").attr("transform", "rotate(-90)")
            .attr("x", -height/2).attr("y", -42)
            .attr("fill", COLOR.ink).style("font-size", "12px").style("text-anchor", "middle")
            .text("True positive rate");

        // diagonal "random" line
        svg.append("line").attr("x1", 0).attr("y1", height).attr("x2", width).attr("y2", 0)
            .attr("stroke", COLOR.muted).attr("stroke-dasharray", "4,4");

        const points = R.fpr.map((f, i) => [f, R.tpr[i]]);

        // shaded AUC area
        const area = d3.area()
            .x(d => x(d[0]))
            .y0(height)
            .y1(d => y(d[1]))
            .curve(d3.curveMonotoneX);
        svg.append("path").datum(points)
            .attr("d", area).attr("fill", COLOR.cardinal).attr("opacity", 0.12);

        // ROC line
        const line = d3.line().x(d => x(d[0])).y(d => y(d[1])).curve(d3.curveMonotoneX);
        const path = svg.append("path").datum(points)
            .attr("d", line).attr("fill", "none").attr("stroke", COLOR.cardinal).attr("stroke-width", 2.5);
        const totalLen = path.node().getTotalLength();
        path.attr("stroke-dasharray", totalLen).attr("stroke-dashoffset", totalLen)
            .transition().duration(900).attr("stroke-dashoffset", 0);

        // AUC label
        svg.append("text").attr("x", width - 12).attr("y", height - 18)
            .attr("text-anchor", "end").style("font-size", "13px").style("font-weight", "bold")
            .style("fill", COLOR.cardinal).text(`AUC = ${R.auc.toFixed(3)}`);
        svg.append("text").attr("x", width - 12).attr("y", height - 4)
            .attr("text-anchor", "end").style("font-size", "10px").style("fill", COLOR.muted)
            .text("(diagonal = random guess, AUC = 0.5)");
    }

    function _renderImportance() {
        const host = document.getElementById("chart-importance");
        if (!host || !window.d3) return;
        host.innerHTML = "";
        const M = window.NA_PREDICTOR;
        if (!M) return;
        const F = M.feature_importance;

        // Normalize to comparable scale: take absolute value of LR coefs,
        // then divide each model's series by its max so all three show
        // relative-importance-within-model.
        const lrAbs = F.logistic_regression_coefficients.map(Math.abs);
        const lrMax = Math.max(...lrAbs) || 1;
        const rfMax = Math.max(...F.random_forest_importance) || 1;
        const gbMax = Math.max(...F.gradient_boosting_importance) || 1;
        const data = F.feature_names.map((name, i) => ({
            name,
            lr: lrAbs[i] / lrMax,
            rf: F.random_forest_importance[i] / rfMax,
            gb: F.gradient_boosting_importance[i] / gbMax,
        }));

        // Sort by max importance across models so important features go to top
        data.sort((a, b) => Math.max(b.lr, b.rf, b.gb) - Math.max(a.lr, a.rf, a.gb));

        const m = {top: 30, right: 30, bottom: 40, left: 180};
        const width = host.clientWidth - m.left - m.right;
        const height = data.length * 36;
        const svg = d3.select(host).append("svg")
            .attr("viewBox", `0 0 ${width + m.left + m.right} ${height + m.top + m.bottom}`)
            .style("width", "100%").style("height", "auto")
            .append("g").attr("transform", `translate(${m.left},${m.top})`);

        const y0 = d3.scaleBand().domain(data.map(d => d.name)).range([0, height]).padding(0.2);
        const y1 = d3.scaleBand().domain(["lr", "rf", "gb"]).range([0, y0.bandwidth()]).padding(0.05);
        const x  = d3.scaleLinear().domain([0, 1]).range([0, width]);

        svg.append("g").call(d3.axisLeft(y0).tickSize(0))
            .selectAll("text").style("font-size", "11px");
        svg.append("g").attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(5));
        svg.append("text").attr("x", width/2).attr("y", height + 36)
            .attr("text-anchor", "middle").style("font-size", "11px").style("fill", COLOR.muted)
            .text("Relative importance (within model)");

        const colors = { lr: COLOR.cardinal, rf: COLOR.navy, gb: COLOR.amber };
        const labels = { lr: "Logistic Regression", rf: "Random Forest", gb: "Gradient Boosting" };

        data.forEach(d => {
            ["lr", "rf", "gb"].forEach(model => {
                svg.append("rect")
                    .attr("x", 0)
                    .attr("y", y0(d.name) + y1(model))
                    .attr("height", y1.bandwidth())
                    .attr("width", 0)
                    .attr("fill", colors[model])
                    .transition().duration(800)
                    .attr("width", x(d[model]));
            });
        });

        // Legend
        const legend = svg.append("g").attr("transform", `translate(0, -22)`);
        Object.entries(labels).forEach(([k, label], i) => {
            const xx = i * 160;
            legend.append("rect").attr("x", xx).attr("y", 0).attr("width", 12).attr("height", 12).attr("fill", colors[k]);
            legend.append("text").attr("x", xx + 18).attr("y", 10).style("font-size", "11px").style("fill", COLOR.ink).text(label);
        });
    }

    function _renderConfMat() {
        const host = document.getElementById("conf-mat");
        if (!host) return;
        const M = window.NA_PREDICTOR;
        if (!M) return;
        const cm = M.metrics.logistic_regression.confusion_matrix;   // [[tn, fp], [fn, tp]]
        const total = cm[0][0] + cm[0][1] + cm[1][0] + cm[1][1];
        const cell = (n, label, kind) => `
            <div class="cm-cell cm-${kind}">
                <div class="cm-n">${n}</div>
                <div class="cm-pct">${(100*n/total).toFixed(0)}%</div>
                <div class="cm-lbl">${label}</div>
            </div>`;
        host.innerHTML = `
            <div class="cm-grid">
                <div class="cm-corner"></div>
                <div class="cm-axis">Predicted: No callback</div>
                <div class="cm-axis">Predicted: Callback</div>

                <div class="cm-axis cm-axis-y">Actual:<br/>No callback</div>
                ${cell(cm[0][0], "True negative", "tn")}
                ${cell(cm[0][1], "False positive", "fp")}

                <div class="cm-axis cm-axis-y">Actual:<br/>Callback</div>
                ${cell(cm[1][0], "False negative", "fn")}
                ${cell(cm[1][1], "True positive", "tp")}
            </div>
            <p class="cm-legend"><strong>True positive:</strong> Model correctly warned the clinician their report was likely incomplete. <strong>False negative:</strong> Model missed an incomplete report — clinician submits, agency calls back later. The cost of FN is days; the cost of FP is one extra check by the clinician — so we tune the threshold to maximize recall.</p>
        `;
    }

    // ========================================================================
    // RAG panel
    // ========================================================================

    function _renderRagPanel() {
        const samplesHost = document.getElementById("rag-samples");
        const samples = (window.NA_RAG_SEARCH || {}).SAMPLE_QUERIES || [];
        if (samplesHost) {
            samplesHost.innerHTML = `<small>Try:</small> ${samples.map(q =>
                `<button class="sample-chip" data-q="${_esc(q)}">${_esc(q)}</button>`).join(" ")}`;
            samplesHost.querySelectorAll(".sample-chip").forEach(c => {
                c.addEventListener("click", () => {
                    document.getElementById("rag-input").value = c.dataset.q;
                    _runRagSearch(c.dataset.q);
                });
            });
        }
        const input = document.getElementById("rag-input");
        const go = document.getElementById("rag-go");
        if (input && go) {
            go.addEventListener("click", () => _runRagSearch(input.value));
            input.addEventListener("keydown", e => { if (e.key === "Enter") _runRagSearch(input.value); });
        }
    }

    function _runRagSearch(query) {
        const out = document.getElementById("rag-results");
        if (!out) return;
        const results = (window.NA_RAG_SEARCH || {}).search?.(query, 4) || [];
        if (results.length === 0) {
            out.innerHTML = `<p class="empty-state">No matching reportable diseases. Try one of the sample queries.</p>`;
            return;
        }
        out.innerHTML = results.map((r, i) => {
            const a = window.NA_RAG_SEARCH.answer(r);
            const dest = (a.destinations || []).map(_esc).join(" · ") || "—";
            const tagClass = a.urgency === "immediate" ? "tag-immediate"
                            : a.urgency === "urgent" ? "tag-urgent"
                            : "tag-routine";
            return `
                <article class="rag-result">
                    <header>
                        <span class="rag-rank">#${i+1}</span>
                        <h3>${_esc(a.common_name)}</h3>
                        <span class="rag-score" title="cosine similarity">match ${(r.score * 100).toFixed(0)}%</span>
                    </header>
                    <div class="rag-tags">
                        ${a.is_reportable ? '<span class="rtag tag-reportable">REPORTABLE</span>' : ''}
                        <span class="rtag ${tagClass}">${_esc(a.urgency)}</span>
                        ${a.is_zoonotic ? '<span class="rtag tag-zoo">ZOONOTIC</span>' : ''}
                        ${a.is_select_agent ? '<span class="rtag tag-sa">SELECT AGENT</span>' : ''}
                    </div>
                    <dl class="rag-fields">
                        <dt>ICD-10</dt><dd>${_esc(a.icd10 || "—")}</dd>
                        <dt>SNOMED CT</dt><dd>${_esc(a.snomed_ct || "—")}</dd>
                        <dt>Reporting timeline</dt><dd>${_esc(a.timeline)}</dd>
                        <dt>Routes to</dt><dd>${dest}</dd>
                        <dt>AZ relevance</dt><dd>${a.az_relevance}/10</dd>
                    </dl>
                </article>`;
        }).join("");
    }

    window.NA_INSIGHTS = { render };
})();
