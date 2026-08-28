const asset = (name) => `assets/${name}`;
const fig = (src, alt, caption, status = "publication_review") => ({ src: asset(src), alt, caption, status });

// Public-facing repository model. Paths are intentionally omitted; plot provenance
// and disclosure status remain internal until the publication review is complete.
const workflowData = {
  calibration: {
    role: "Shared experimental context",
    title: "TF perturbation & dose",
    summary: "Validates the perturbation and supplies measured dose metadata without treating validation plots as an analysis branch.",
    input: "graded dTAG conditions and biological replicates",
    output: "validated perturbation and measured TF-dose tables",
    workflowGroups: [
      { title: "FACS validation", script: "Reporter_Titration_Replicate_*.R", scriptLabel: "FACS replicate scripts", status: "replicate-specific analysis", steps: ["Import and transform FCS events", "Draw cell polygon gates", "Apply singlet gates", "Extract BFP and mCherry intensities", "Name conditions and identify controls", "Calculate normalized fluorescence medians", "Plot ridges, densities and event counts", "Assemble replicate-level titration curves"] },
      { title: "RT-qPCR dose", script: "202502_Emilia_reporter_titrations_rep1-3_v0.1.2.R", scriptLabel: "qPCR titration v0.1.2.R", status: "compact calibration", steps: ["Parse RT status, replicate and dTAG dose", "Average technical wells", "Normalize Cq to reference genes", "Scale expression to the reference condition", "Export replicate-aware TF percentages and curves"] }
    ],
    methods: ["gating diagnostics", "ΔCq / ΔΔCq", "relative abundance", "replicate-aware dose map"],
    tools: ["flowCore", "ggcyto", "tidyverse"],
    artifacts: ["condition metadata", "replicate dose map"],
    figures: [
      fig("FACS_plots.png", "FACS reporter-intensity distributions and a GFP–BFP gating plot", "Reporter distributions and gating used to validate the perturbation readout."),
      fig("qPCR_plots.png", "RT-qPCR dose curves for two perturbed transcription factors", "RT-qPCR calibration of the biological dose axis.")
    ]
  },
  atac_reads: {
    role: "ATAC-seq processing repository",
    title: "Reads, peaks & tracks",
    summary: "Converts paired-end ATAC-seq reads into quality-controlled alignments, reproducible peak sets and normalized signal tracks.",
    input: "paired-end ATAC FASTQs and sample metadata",
    output: "QC reports, merged peaks and CPM bigWigs",
    workflowGroups: [
      { title: "ENCODE runs", script: "1b_encode_atac_seq_pipeline_run_v0.1.0.sh", status: "canonical", steps: ["Resolve replicate FASTQs and metadata", "Launch per-dataset ENCODE ATAC jobs", "Align and filter paired-end reads", "Create replicate and pooled alignments", "Call pseudoreplicate-aware peaks", "Collect IDR and overlap peak sets"] },
      { title: "QC summaries", script: "2_encode_atac_seq_pipeline_summarize_qc_reports_v0.0.5.R", status: "canonical", steps: ["Collect library and replicate metrics", "Compare mapped-read and duplicate fractions", "Review fragment-length structure", "Review TSS enrichment and FRiP", "Flag run-level QC exceptions", "Render the cross-sample QC summary"] },
      { title: "Peak + signal", script: "3_encode_atac_seq_pipeline_merge_overlapping_peaks_v0.1.0.sh · 4_make_cpm_norm_bigwigs_v0.1.1.sh", status: "canonical", steps: ["Select reproducible overlap/IDR peaks", "Merge overlapping regions across samples", "Calculate mapped-read scaling factors", "Generate CPM-normalized bigWigs", "Publish peak and signal inputs"] }
    ],
    methods: ["alignment QC", "TSS enrichment", "FRiP", "IDR/overlap peaks", "CPM coverage"],
    tools: ["ENCODE ATAC", "Caper", "bowtie2", "MACS2", "deepTools", "bedtools"],
    artifacts: ["merged peaks", "BAM", "bigWig", "QC summary"],
    figures: [fig("ATAC_QC.png", "TSS-enrichment scores across the ATAC-seq titration libraries", "TSS-enrichment quality control across the processed ATAC-seq samples.")]
  },
  atac_evidence: {
    role: "ATAC-seq evidence construction",
    title: "Response & sequence evidence",
    summary: "Constructs quantitative accessibility responses and calibrated motif evidence before the compound peak analysis.",
    input: "processed alignments, merged peaks, sequence windows and ATAC signal",
    output: "response contrasts, contribution maps and calibrated motif sites",
    workflowGroups: [
      { lane: 0, title: "Differential accessibility", script: "1b_find_differential_peaks_diffbind_v0.0.14.R", status: "canonical", steps: ["Build the consensus peak universe", "Center fixed response windows on summits", "Count reads per replicate and condition", "Normalize accessibility with DiffBind/DESeq2", "Fit endpoint contrasts", "Export broad peaks, windows and response tables"] },
      { lane: 1, title: "ChromBPNet", script: "2c_ChromBPNet_train_and_contribs_v0.1.6.sh", status: "canonical", steps: ["Prepare genome, peaks and bias inputs", "Define chromosome-held-out folds", "Train profile and count models", "Evaluate predictions on held-out chromosomes", "Export base-resolution contribution scores"] },
      { lane: 1, title: "Learned patterns", script: "0_run_tf_modisco_workflow_v0.1.0.sh · 0_run_finemo_workflow_v0.1.0.sh", status: "canonical", steps: ["Select contribution windows", "Discover seqlets and patterns with TF-MoDISco", "Match pattern CWMs with Tomtom", "Map pattern instances with FiNeMo", "Export genomic pattern tables"] },
      { lane: 2, title: "Known motifs", script: "1_fimo_annotate_v0.1.16.sh · 2_tf_specific_fimo_annotate_v0.0.6.sh · 3_selected_family_chrombpnet_calibration_v0.0.2.sh", status: "canonical", steps: ["Build fixed 501-bp peak sequences", "Scan JASPAR and HOCOMOCO PWMs with FIMO", "Retain strict and lenient hit tiers", "Calculate within-PWM relative scores", "Collapse overlapping calls into physical sites", "Calibrate selected-family positive-q95 and negative-q05 contribution support", "Export genomic and peak-linked motif tables"] }
    ],
    methods: ["DiffBind contrasts", "held-out chromosomes", "base attribution", "calibrated motif support", "pattern instances"],
    tools: ["DiffBind", "DESeq2", "ChromBPNet", "TF-MoDISco", "FiNeMo", "FIMO", "Tomtom"],
    artifacts: ["contribution bigWig", "pattern catalog", "FiNeMo BED", "calibrated FIMO table"],
    figures: [
      fig("ATACseq_analysis_differential_peaks.png", "Volcano plot of differential ATAC-seq peaks after transcription-factor depletion", "Differential accessibility defines opening, closing and unchanged peak responses."),
      fig("ATACseq_analysis_tfmodiscopatterns.png", "TF-MoDISco and FiNeMo pattern summary across samples", "Learned contribution patterns and their sequence logos."),
      fig("ATAC_motif_families_clustering.png", "Correlation heatmap clustering transcription-factor motifs into families", "Response-blind motif clustering reduces redundant motif models to interpretable families."),
      fig("ATAC_motif_families_clustering_2.png", "Representative motif-family members and their sequence logos", "Examples of related motif models grouped into shared transcription-factor families.")
    ]
  },
  atac_integrate: {
    role: "ATAC-seq compound analysis",
    title: "Peak response & grammar",
    summary: "Integrates peak responses, dose trajectories, motif and sequence-model evidence, genomic context and RNA annotations, then carries selected loci into cross-state and sequence-perturbation follow-ups.",
    input: "ATAC counts, signal tracks, motif/model evidence, RNA annotations and canonical sequence models",
    output: "annotated peaks, reliable response parameters, regulatory evidence reports and sparse perturbation designs",
    workflowGroups: [
      { title: "Peak atlas", script: "1b_atac_motif_grammar_analysis_v0.0.38.R · sections 2–4", status: "canonical", steps: ["Load broad peaks and normalized counts", "Attach pooled ATAC and external signal", "Define endpoint response classes", "Assign peaks to genes under several strategies", "Add chromatin and ENCODE cCRE context", "Import calibrated FIMO and FiNeMo instances", "Build tiered motif and ChromBPNet summaries"] },
      { title: "ATAC–RNA integration", script: "same R script · section 5", status: "canonical", steps: ["Prepare gene-response annotations", "Join peaks by gene-body and distance rules", "Join peaks to closest responding genes", "Benchmark distal, promoter and all-element activity-by-distance predictors at shared doses", "Compare assignment strategies"] },
      { title: "Dose response", script: "same R script · sections 6–8", status: "canonical", steps: ["Prepare replicate-level endpoint-scaled observations", "Fit fixed, flexible and linear candidate models", "Select models by AICc and quality rules", "Extract corrected ED50 and direction-adjusted Hill parameters", "Apply parameter-specific reliability gates", "Define direct-target and response populations", "Compare genomic contexts"] },
      { title: "Motifs & grammar", script: "same R script · sections 9–12", status: "canonical analysis", steps: ["Construct matched biological contrasts", "Run AME and STREME on fixed 501-bp sequences", "Cluster known motifs into response-blind families", "Compare calibrated family sites and FiNeMo patterns", "Test motif abundance, diversity and Oct4-to-partner distances", "Model ED50 from sequence and regulatory evidence", "Screen representative families across continuous response bins"] },
      { title: "Cross-state evidence", script: "2a_cross_state_chrombpnet_calibration_v0.0.1.sh · 2b_cross_state_tfmodisco_summary_v0.0.1.sh · 2c_cross_state_regulatory_evidence_report_v0.0.1.R", scriptLabel: "cross-state calibration · evidence report", status: "exploratory follow-up", steps: ["Compare motif and sequence-attribution evidence across pluripotent and differentiation states", "Connect model evidence with candidate-TF expression", "Render a compact cross-state regulatory-evidence report"] },
      { title: "Exploratory sequence-model trials", script: "4a_atac_cherimoya_model_integration_v0.0.1.R · 4b_atac_cherimoya_genomic_locus_plots_v0.0.1.R · sequence_perturbations.sh", scriptLabel: "model integration · sequence perturbations", status: "exploratory trial", steps: ["Compare held-out Cherimoya predictions with observed peak responses", "Inspect selected loci alongside motif and contribution evidence", "Test sparse sequence substitutions as preliminary response-switching designs"] },
      { title: "Exports", script: "1b_atac_motif_grammar_analysis_v0.0.38.R · section 13", status: "canonical", steps: ["Write one-row-per-peak annotations", "Save dose, motif and model result bundles", "Export compact handoffs for sequence models", "Publish diagnostic and genomic-locus reports"] }
    ],
    methods: ["LL.4 dose fits", "parameter-specific reliability", "matched controls", "AME/STREME", "OOF sequence models", "cross-state calibration", "in silico mutagenesis"],
    tools: ["data.table", "GenomicRanges", "DiffBind", "drc", "MEME Suite", "nullranges", "Cherimoya", "Tangermeme", "Ledidi", "Gviz"],
    artifacts: ["broad_peak_annotations.tsv", "dose_response_results.tsv", "canonical OOF predictions", "regulatory-evidence reports", "perturbation design manifests"],
    figures: [
      fig("ATACseq_analysis_curves.png", "Representative fitted ATAC accessibility dose-response curves", "Responsive peaks span a range of fitted midpoints and curve shapes."),
      fig("ATACseq_analysis_enrichedmotifs.png", "Enriched motif families with prevalence differences, odds ratios and sequence logos", "Response-associated motif-family evidence across accessibility classes."),
      fig("ATACseq_analysis_genomiccontext.png", "Genomic and ENCODE cCRE context across ATAC peak-response groups", "Peak responses and direct-target groups occupy distinct regulatory contexts."),
      fig("ATAC_genomic_plots.png", "Genomic locus with ATAC dose tracks, ChIP, cCREs, sequence contributions and motifs", "A locus-level view connecting dose-dependent accessibility with regulatory-sequence evidence.")
    ]
  },
  scrna_quant: {
    role: "scRNA-seq preprocessing workflow",
    title: "Counts, MULTI-seq & QC",
    summary: "Uses STARsolo as the main quantification input for demultiplexing and cell QC, with Cell Ranger retained as a separate parallel quantification track.",
    input: "gene-expression and MULTI-seq FASTQs, barcode map and genome resources",
    output: "STARsolo-derived singlet SCE objects and allele-aware BAMs, plus parallel Cell Ranger QC",
    workflowGroups: [
      { lane: 0, title: "STARsolo", script: "2_run_star_diploidGenome_mm10-JJF-v008_v1.0.3.sh", status: "main analysis input", steps: ["Align to the custom diploid genome", "Quantify gene and extended features", "Write cell-by-feature matrices", "Retain tagged BAMs for allelic counting"] },
      { lane: 1, title: "Cell Ranger", script: "1_run_cellranger_mm10default_v1.0.1.sh", status: "parallel quantification", steps: ["Launch one job per replicate dataset", "Align to the standard mouse reference", "Call cell barcodes and UMIs", "Retain raw and filtered gene matrices", "Collect run-level mapping and cell metrics"] },
      { lane: 0, title: "MULTI-seq assignment", script: "3b_scrnaseq_preprocessing_v0.3.5.R · demultiplexing", status: "from STARsolo matrices", steps: ["Load STARsolo gene-count matrices into SCE", "Parse MULTI-seq tag reads", "Match tag reads to cell barcodes", "Assign singlets, doublets and negatives with deMULTIplex2", "Attach sample, replicate and perturbation metadata"] },
      { lane: 0, title: "Cell QC & SCE", script: "3b_scrnaseq_preprocessing_v0.3.5.R · processing loop", status: "main analysis path", steps: ["Calculate library, feature and mitochondrial metrics", "Normalize counts and select variable features", "Run PCA and graph-based clustering", "Calculate UMAP embeddings", "Render QC views before filtering", "Apply quality thresholds", "Retain experimental singlets", "Save unfiltered, QC-filtered and singlet SCE checkpoints"] }
    ],
    methods: ["droplet quantification", "custom diploid reference", "MULTI-seq demultiplexing", "singlet filtering", "PCA/UMAP", "cell QC"],
    tools: ["Cell Ranger", "STARsolo", "deMULTIplex2", "SingleCellExperiment", "scuttle", "scran", "scater", "uwot"],
    artifacts: ["filtered matrix", "STAR BAM", "mapping QC"],
    figures: [
      fig("scRNAseq_preprocessing_MULTIseq.png", "UMAPs colored by MULTI-seq barcode assignment and barcode count", "MULTI-seq demultiplexing separates sample identities and highlights ambiguous assignments."),
      fig("scRNAseq_preprocessing_clustering.png", "Single-cell UMAPs colored by cluster and sample identity", "Cell-state structure and sample mixing after preprocessing."),
      fig("scRNAseq_QC.png", "Cell counts and summary quality metrics across single-cell samples", "Cell-retention and library-quality summary after filtering and singlet selection.")
    ]
  },
  scrna_response: {
    role: "scRNA-seq response analysis",
    title: "Expression dose response",
    summary: "Turns filtered cells into replicate-aware gene responses, continuous dose curves and response clusters.",
    input: "STARsolo-derived filtered SCE objects and perturbation annotations",
    output: "pseudobulk contrasts, fitted curves and gene-response groups",
    workflowGroups: [
      { title: "Dose axis", script: "4b_scrnaseq_analysis_v0.3.9.R · sections 2–4", status: "canonical", steps: ["Combine filtered replicate SCE objects", "Measure cellular perturbed-gene expression", "Define expression-based dose bins", "Audit cells and replicates per bin", "Build pseudobulk count summaries", "Export guide-by-treatment expression and response handoffs"] },
      { title: "Response calls", script: "same R script · sections 5–6", status: "canonical", steps: ["Construct replicate-bin observations", "Run endpoint and bin-wise DESeq2 contrasts", "Fit and select dose models", "Extract ED50 and response-tail metrics", "Run leave-one-replicate-out stability", "Freeze reliable curve-tail groups", "Cluster genes by response pattern", "Export response tables, heatmaps and curves"] }
    ],
    methods: ["pseudobulk", "DESeq2", "dose-response fitting", "leave-one-replicate-out", "response clustering"],
    tools: ["SingleCellExperiment", "DESeq2", "drc", "data.table", "ComplexHeatmap"],
    artifacts: ["gene response table", "dose-fit table", "cluster assignments", "heatmap matrices"],
    figures: [
      fig("scRNAseq_analysis.png", "PCA of single cells and expression-based transcription-factor dose bins", "The expression-derived dose axis connects heterogeneous cells to a continuous perturbation scale."),
      fig("scRNAseq_differential_genes.png", "Series of differential-expression volcano plots across transcription-factor dose bins", "Dose-resolved differential-expression contrasts identify responding genes."),
      fig("scRNAseq_analysis_curves.png", "Representative fitted single-cell RNA dose-response curves", "Replicate-aware gene responses span a range of fitted midpoints and shapes.")
    ]
  },
  scrna_programs: {
    role: "scRNA-seq compound analysis",
    title: "Gene programs & motifs",
    summary: "Combines the STARsolo-derived allelic branch with gene-program annotation and a restartable promoter motif workflow with matched controls and positional profiles.",
    input: "gene responses, STARsolo tagged BAMs and genome annotations",
    output: "gene programs, XCI summaries, matched motif enrichments, indexed motif calls and positional profiles",
    workflowGroups: [
      { lane: 1, title: "Allelic / XCI branch", script: "3c_allele_specific_counting_v0.1.0.sh · 3d_prepare_xci_data_v0.1.0.R", status: "from STARsolo BAMs", steps: ["Filter tagged diploid BAMs", "Split informative B6 and CAST reads", "Count allele-specific UMIs", "Join cell and perturbation annotations", "Prepare the XCI analysis object", "Join expression-derived dose bins in the main analysis"] },
      { lane: 0, title: "Gene programs", script: "4b_scrnaseq_analysis_v0.3.9.R · sections 7–13", status: "canonical", steps: ["Annotate reliable response genes", "Compare response-cluster expression", "Run GO and feature enrichment", "Assign ChIP and ATAC evidence", "Attach promoter and genomic context", "Export frozen motif-analysis inputs", "Render automated gene-browser views"] },
      { lane: 0, title: "Motif enrichment", script: "4c_scrnaseq_motif_enrichment_v0.1.1.R", status: "canonical", steps: ["Materialize canonical promoter and accessible-sequence sets", "Define direction and reciprocal curve-tail comparisons", "Match control genes with nullranges and balance diagnostics", "Build outcome-independent motif families", "Run AME and restartable STREME/Tomtom analyses", "Run exploratory adaptive-bin monaLisa analyses", "Publish family representatives and positional-profile handoffs"] },
      { lane: 0, title: "Bounded FIMO scan", script: "4d_scrnaseq_fimo_scan_v0.1.1.sh", status: "canonical", steps: ["Read the selected-family target manifest", "Scan JASPAR 2026 and HOCOMOCO v14 motifs", "Restrict calls to declared promoter and accessible regions", "Sort, bgzip and Tabix-index motif hits", "Publish unique Pou5f1 anchors for downstream profiles"] },
      { lane: 0, title: "Motif profiles", script: "4e_scrnaseq_motif_profiles_v0.1.0.R", status: "canonical", steps: ["Import bounded motif calls in batches", "Orient promoter profiles by transcription start site", "Build response-group and equal-gene-weight profiles", "Bootstrap genes and permute within-gene anchor positions", "Summarize selected-family motif burden", "Render TSS and Pou5f1-centered cofactor reports"] }
    ],
    methods: ["allele-specific expression", "GO enrichment", "nullranges matching", "AME/STREME", "bounded FIMO", "bootstrap/permutation profiles"],
    tools: ["STARsolo", "samtools", "featureCounts", "umi_tools", "DESeq2", "MEME Suite", "GenomicRanges", "Rsamtools", "ChIPseeker", "monaLisa", "Gviz", "gprofiler2"],
    artifacts: ["gene annotation RDS", "XCI object", "motif family handoff", "Tabix-indexed FIMO hits", "profile reports", "browser PDFs"],
    figures: [fig("scRNAseq_tfmotif_profiles.png", "Cofactor motif profiles around transcription-factor motifs in promoters of differential genes", "Promoter-centered motif profiles compare upregulated, downregulated and unchanged RNA-response groups.")]
  },
  mpra_design: {
    role: "MPRA library-design repository",
    title: "Library construction",
    summary: "Transforms ATAC, motif and contribution evidence into synthesis-ready CREs and a structured control library.",
    input: "ATAC candidates, motif/model evidence and control sequences",
    output: "unique synthesis designs and downstream CRE references",
    workflowGroups: [
      { title: "Candidate evidence", script: "1_fimo_annotate_for_MPRA_v0.1.5.sh · 2_find_differential_peaks_diffbind_for_MPRA_v0.0.11.R · 3_annotate_peaks_for_MPRA_v0.0.15.R", status: "canonical", steps: ["Scan selected Oct4 motif models", "Build the differential-accessibility report", "Attach genomic and peak-response annotations", "Join ChromBPNet contribution evidence", "Freeze version-matched candidate inputs"] },
      { title: "Tile & select", script: "4_make_MPRA_library_v0.0.31.R", status: "frozen design", steps: ["Generate eligible sequence tiles", "Position motifs within synthesis windows", "Score base-level contribution support", "Select genomic response categories", "Match background and comparison CREs", "Retain both sequence orientations where required"] },
      { title: "Control design", script: "same R script · control sections", status: "frozen design", steps: ["Create dinucleotide-shuffled controls", "Design motif-depleted derivatives", "Import published positive and negative controls", "Add cloning and technical controls", "Balance control classes and orientations"] },
      { title: "Oligo assembly & QC", script: "4_make_MPRA_library_v0.0.31.R · 5_collapse_duplicate_cre_sequences_v0.1.0.R", status: "canonical", steps: ["Pad short inserts", "Remove problematic junction sequences", "Add cloning arms", "Check length, alphabet and restriction sites", "Collapse duplicate CRE sequences", "Assign stable design identifiers", "Export synthesis TSV and reference FASTA"] }
    ],
    methods: ["dynamic tiling", "contribution scoring", "matched controls", "dinucleotide shuffling", "motif depletion", "junction QC"],
    tools: ["DiffBind", "FIMO", "ChromBPNet", "Biostrings", "universalmotif", "nullranges", "Gviz"],
    artifacts: ["design TSV", "unique CRE FASTA", "oligo table", "library report"],
    figures: [
      fig("MPRA_lib_design_1.png", "Final MPRA library composition and insert GC-content distribution", "Candidate, control and synthesis-aware library composition."),
      fig("MPRA_lib_design_2.png", "Genomic regulatory tracks and sequence evidence for a selected MPRA tile", "A synthesis tile selected from endogenous accessibility, binding and sequence-model evidence.")
    ]
  },
  mpra_count: {
    role: "MPRA preprocessing repositories",
    title: "Barcode assignment & counts",
    summary: "Links CREs to barcodes from lookup sequencing, then applies that lookup to produce replicate-preserving DNA and RNA count matrices.",
    input: "lookup and count FASTQs, CRE design references and experiment config",
    output: "quality-controlled CRE–barcode assignments and DNA/RNA count matrices",
    workflowGroups: [
      { title: "Lookup read QC", script: "1_run_fastp_multiqc_v0.1.0.sh", status: "lookup repository", steps: ["Run fastp per lookup library", "Aggregate reports with MultiQC", "Verify paired-read structure and anchors"] },
      { title: "CRE references", script: "2_build_reference_v0.1.0.sh", status: "lookup repository", steps: ["Validate unique designed CRE sequences", "Build full-length reference keys", "Build partial prefix and suffix keys", "Flag inherently ambiguous sequence prefixes"] },
      { title: "Extract & assign", script: "3_extract_all_samples_v0.1.0.sh · 4_cluster_and_finalize_v0.1.0.sh", status: "lookup repository", steps: ["Extract anchored barcode and CRE fields", "Match full-length CRE observations", "Reconcile prefix and suffix evidence", "Cluster observations by barcode", "Classify exact, dominant, ambiguous and unmatched assignments", "Retain assignment-support counts"] },
      { title: "Lookup export", script: "5_export_mprasnakeflow_inputs_v0.1.0.sh · 6_create_final_table_v0.1.0.R", status: "lookup repository", steps: ["Apply exact-support and dominance filters", "Create enriched diagnostic tables", "Export MPRAsnakeflow-compatible lookup", "Plot assignment yield and ambiguity"] },
      { title: "Count-library setup", script: "1_run_fastp_multiqc_v0.1.0.sh · 2_setup_mprasnakeflow_counts_v0.1.0.sh", status: "count repository", steps: ["QC DNA and RNA FASTQs", "Confirm the 12-nt barcode structure", "Validate configs and samplesheets", "Bind the selected upstream lookup", "Prepare the Snakemake environment"] },
      { title: "DNA/RNA counting", script: "3_run_mprasnakeflow_counts_v0.1.0.sh", status: "count repository", steps: ["Extract observed barcodes", "Assign reads through the CRE lookup", "Preserve DNA/RNA sample and replicate identities", "Merge barcode-level count matrices", "Collect workflow and assignment QC"] }
    ],
    methods: ["anchored paired-read parsing", "assignment dominance", "ambiguity retention", "barcode extraction", "lookup-based counting", "replicate preservation"],
    tools: ["fastp", "MultiQC", "awk", "data.table", "MPRAsnakeflow", "Snakemake", "conda"],
    artifacts: ["assigned count TSV", "sample QC", "count matrices", "workflow logs"],
    figures: [
      fig("MPRA_CRE-BC_lookup_1.png", "Accepted barcodes, recovered CREs and supported reads across lookup samples", "CRE–barcode lookup recovery across samples and assignment settings."),
      fig("MPRA_CRE-BC_lookup_2.png", "Per-sample CRE–barcode assignment fractions and read counts", "Unique, ambiguous and unmatched CRE assignments across lookup libraries.")
    ]
  },
  mpra_analysis: {
    role: "MPRA compound analysis",
    title: "Activity & dose response",
    summary: "One large R workflow joins counts, lookup, design, qPCR and ATAC annotations, then follows inferential and descriptive branches.",
    input: "DNA/RNA counts, lookup, design, qPCR dose and ATAC annotations",
    output: "activity calls, response curves, orientation and ATAC comparisons",
    workflowGroups: [
      { title: "Canonical tables", script: "4b_mpra_analysis_v0.0.24.R · sections 2–3", status: "current launcher", steps: ["Load qPCR dose, lookup and library metadata", "Standardize barcode count tables", "Join CRE identities and design categories", "Build long barcode-level activity tables", "Aggregate element-level activity", "Create reusable model matrices", "Build orientation-pair summaries"] },
      { title: "Normalization & QC", script: "same R script · sections 4–5", status: "current launcher", steps: ["Quantify spike-in recovery", "Build spike-corrected sensitivity tables", "Inspect barcode and input-count distributions", "Summarize sample and library origins", "Calculate replicate correlations and PCA", "Audit activity-scale agreement", "Assemble QC reports"] },
      { title: "Count models", script: "same R script · sections 6–7", status: "current launcher", steps: ["Fit basal BCalm activity", "Construct all-dose contrast inputs", "Run BCalm-style mpralm", "Run aggregated sensitivity models", "Fit spike-corrected limma activity", "Fit an independent RNA-only model", "Compare endpoint concordance", "Run spike-anchored robustness tests"] },
      { title: "Dose & orientation", script: "same R script · sections 8–10", status: "current launcher", steps: ["Build descriptive activity trajectories", "Cluster response profiles", "Construct replicate-level DRC inputs", "Fit eligible dose-response curves", "Audit fit status and retention", "Plot selected curves", "Compare forward/reverse-complement results", "Fit orientation-delta models"] },
      { title: "ATAC interpretation", script: "same R script · sections 11–14", status: "current launcher", steps: ["Test library-feature and control associations", "Compare endpoint MPRA and ATAC activity", "Build all-dose MPRA–ATAC pairs", "Run association and bootstrap tests", "Measure trajectory concordance", "Run permutation diagnostics", "Render matrices and response summaries"] },
      { title: "Focused outputs", script: "same R script · sections 15–17", status: "current launcher", steps: ["Resolve prioritized CREs", "Assemble activity and model tables", "Join ATAC and motif features", "Plot focused activity and DRC panels", "Build unified interpretation tables", "Export canonical results"] },
      { title: "Extended analysis", script: "4b_mpra_analysis_v0.0.25.R", status: "development", steps: ["Extend endpoint-scaled model selection", "Add reliability diagnostics", "Add secondary response summaries", "Retain draft status until launcher promotion"] }
    ],
    methods: ["BCalm", "mpralm", "spike normalization", "dose-response fitting", "orientation models", "bootstrap/permutation tests"],
    tools: ["MPRAsnakeflow", "BCalm", "limma", "mpra", "drc", "data.table", "ggplot2"],
    artifacts: ["element activity table", "model results", "dose curves", "MPRA–ATAC tables", "focused CRE report"],
    figures: [
      fig("MPRA_analysis_1.png", "Reporter activities for selected CREs and MPRA library groups", "Basal activity across individual CREs, controls and designed element classes."),
      fig("MPRA_analysis_2.png", "CRE response to transcription-factor depletion across MPRA element groups", "Endpoint reporter responses distinguish designed and control element classes."),
      fig("MPRA_analysis_3.png", "Pairwise replicate correlations for CRE endpoint responses", "Reporter responses are reproducible across biological replicates."),
      fig("MPRA_analysis_4.png", "Representative fitted MPRA activity dose-response curves", "Reporter elements show a range of measurable response midpoints and shapes.")
    ]
  }
};

const connectionData = [
  { from: "atac_reads", to: "atac_evidence", kind: "flow" },
  { from: "atac_evidence", to: "atac_integrate", kind: "flow" },
  { from: "scrna_quant", to: "scrna_response", kind: "flow" },
  { from: "scrna_response", to: "scrna_programs", kind: "flow" },
  { from: "mpra_design", to: "mpra_count", kind: "flow" },
  { from: "mpra_count", to: "mpra_analysis", kind: "flow" }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const diagram = $("#workflow-map");
const svg = $(".workflow-connections");
const connectionLayer = $(".connection-layer");
const nodes = $$("[data-node]");
const nodeMap = Object.fromEntries(nodes.map((node) => [node.dataset.node, node]));

const workspace = $(".atlas-workspace");
const detail = $("#workflow-detail");
const detailContent = $(".detail-content", detail);
const closeButton = $(".detail-close", detail);
const previousButton = $(".detail-previous", detail);
const nextButton = $(".detail-next", detail);
const lightbox = $(".image-lightbox");
const lightboxImage = $("img", lightbox);
const lightboxCaption = $("figcaption", lightbox);
let selected = null;
let lastTrigger = null;
let lastFigureTrigger = null;

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const point = (id, side, gap = 7) => {
  const rect = nodeMap[id].getBoundingClientRect();
  const base = diagram.getBoundingClientRect();
  const x = rect.left - base.left;
  const y = rect.top - base.top;
  return {
    left: [x - gap, y + rect.height / 2], right: [x + rect.width + gap, y + rect.height / 2],
    top: [x + rect.width / 2, y - gap], bottom: [x + rect.width / 2, y + rect.height + gap]
  }[side];
};

const roundedPath = (points, radius = 14) => {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const next = points[i + 1];
    const a = Math.min(radius, Math.hypot(current[0] - previous[0], current[1] - previous[1]) / 2);
    const b = Math.min(radius, Math.hypot(next[0] - current[0], next[1] - current[1]) / 2);
    const before = [current[0] + Math.sign(previous[0] - current[0]) * a, current[1] + Math.sign(previous[1] - current[1]) * a];
    const after = [current[0] + Math.sign(next[0] - current[0]) * b, current[1] + Math.sign(next[1] - current[1]) * b];
    d += ` L${before[0]} ${before[1]} Q${current[0]} ${current[1]} ${after[0]} ${after[1]}`;
  }
  const end = points.at(-1);
  return `${d} L${end[0]} ${end[1]}`;
};

const addPath = (points, kind, ids) => {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", roundedPath(points));
  path.setAttribute("class", `connection ${kind}`);
  path.dataset.nodes = ids.join(",");
  connectionLayer.append(path);
};

const drawConnections = () => {
  if (!diagram || !svg || !connectionLayer) return;
  const width = diagram.clientWidth;
  const height = diagram.clientHeight;
  const mobile = matchMedia("(max-width: 760px)").matches;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  connectionLayer.replaceChildren();

  connectionData.forEach(({ from, to, kind }) => addPath([point(from, "right"), point(to, "left")], kind, [from, to]));

  if (mobile) {
    const shared = point("calibration", "bottom");
    const sharedTargets = ["atac_reads", "scrna_quant", "mpra_design"];
    const sharedEnds = sharedTargets.map((target) => point(target, "left"));
    const sharedRail = 9;
    addPath([shared, [sharedRail, shared[1]], [sharedRail, sharedEnds.at(-1)[1]]], "flow-trunk", ["calibration", ...sharedTargets]);
    sharedTargets.forEach((target, index) => addPath([[sharedRail, sharedEnds[index][1]], sharedEnds[index]], "flow", ["calibration", target]));

    const evidenceStart = point("atac_evidence", "bottom");
    const designEnd = point("mpra_design", "top", 0);
    const upperGutter = height * .39;
    addPath([evidenceStart, [evidenceStart[0], upperGutter], [designEnd[0], upperGutter], designEnd], "transfer", ["atac_evidence", "mpra_design"]);
    const outerRail = width - 5;
    const innerRail = width - 14;
    const scrnaOut = point("scrna_programs", "right");
    const atacOut = point("atac_integrate", "right", 0);
    const mpraOut = point("mpra_analysis", "right", 0);
    const atacUpperPort = [atacOut[0], atacOut[1] - 6];
    const atacLowerPort = [atacOut[0], atacOut[1] + 6];
    addPath([scrnaOut, [outerRail, scrnaOut[1]], [outerRail, atacUpperPort[1]], atacUpperPort], "transfer", ["scrna_programs", "atac_integrate"]);
    addPath([atacLowerPort, [innerRail, atacLowerPort[1]], [innerRail, mpraOut[1]], mpraOut], "transfer", ["atac_integrate", "mpra_analysis"]);
    const allelicStart = point("scrna_quant", "bottom");
    const allelicEnd = point("scrna_programs", "bottom", 0);
    const allelicRail = Math.max(allelicStart[1], allelicEnd[1]) + 13;
    addPath([allelicStart, [allelicStart[0], allelicRail], [allelicEnd[0], allelicRail], allelicEnd], "branch", ["scrna_quant", "scrna_programs"]);
    return;
  }

  const shared = point("calibration", "bottom");
  const sharedTargets = ["atac_reads", "scrna_quant", "mpra_design"];
  const sharedEnds = sharedTargets.map((target) => point(target, "left"));
  const sharedRail = width * .108;
  addPath([shared, [sharedRail, shared[1]], [sharedRail, sharedEnds.at(-1)[1]]], "flow-trunk", ["calibration", ...sharedTargets]);
  sharedTargets.forEach((target, index) => addPath([[sharedRail, sharedEnds[index][1]], sharedEnds[index]], "flow", ["calibration", target]));

  const evidenceStart = point("atac_evidence", "bottom");
  const designEnd = point("mpra_design", "top", 0);
  const upperGutter = height * .39;
  addPath([evidenceStart, [evidenceStart[0], upperGutter], [designEnd[0], upperGutter], designEnd], "transfer", ["atac_evidence", "mpra_design"]);

  const outerRail = width - 11;
  const innerRail = width - 23;
  const scrnaOut = point("scrna_programs", "right");
  const atacOut = point("atac_integrate", "right", 0);
  const mpraOut = point("mpra_analysis", "right", 0);
  const atacUpperPort = [atacOut[0], atacOut[1] - 7];
  const atacLowerPort = [atacOut[0], atacOut[1] + 7];
  addPath([scrnaOut, [outerRail, scrnaOut[1]], [outerRail, atacUpperPort[1]], atacUpperPort], "transfer", ["scrna_programs", "atac_integrate"]);
  addPath([atacLowerPort, [innerRail, atacLowerPort[1]], [innerRail, mpraOut[1]], mpraOut], "transfer", ["atac_integrate", "mpra_analysis"]);
  const allelicStart = point("scrna_quant", "bottom");
  const allelicEnd = point("scrna_programs", "bottom", 0);
  const allelicRail = Math.max(allelicStart[1], allelicEnd[1]) + 15;
  addPath([allelicStart, [allelicStart[0], allelicRail], [allelicEnd[0], allelicRail], allelicEnd], "branch", ["scrna_quant", "scrna_programs"]);
};

const figureMarkup = (figure) => `<figure class="output-card"><img src="${escapeHtml(figure.src)}" alt="${escapeHtml(figure.alt)}"></figure>`;

const outputsMarkup = (item) => `<div class="outputs-grid">${item.figures.map((figure) => `<button class="output-button" type="button" aria-label="Enlarge: ${escapeHtml(figure.caption)}" data-src="${escapeHtml(figure.src)}" data-alt="${escapeHtml(figure.alt)}" data-caption="${escapeHtml(figure.caption)}">${figureMarkup(figure)}</button>`).join("")}</div>`;

const rTools = new Set(["flowCore", "ggcyto", "tidyverse", "DiffBind", "DESeq2", "GenomicRanges", "data.table", "drc", "nullranges", "Gviz", "SingleCellExperiment", "deMULTIplex2", "scuttle", "scran", "scater", "uwot", "ComplexHeatmap", "ChIPseeker", "gprofiler2", "Biostrings", "universalmotif", "BCalm", "limma", "mpra", "ggplot2"]);
const pythonTools = new Set(["ChromBPNet", "TF-MoDISco", "FiNeMo", "Cherimoya"]);
const toolRuntime = (tool) => pythonTools.has(tool) ? "python" : rTools.has(tool) ? "r" : "shell";
const runtimeLabels = { r: "R", python: "Py", shell: "sh" };
const runtimeNames = { r: "R", python: "Python", shell: "shell or command line" };

const ioMarkup = (item) => `
  <section class="details-section io-section">
    <div class="io-flow">
      <div><strong>Input</strong><span>${escapeHtml(item.input)}</span></div>
      <span class="io-arrow" aria-hidden="true">→</span>
      <div><strong>Output</strong><span>${escapeHtml(item.output)}</span></div>
    </div>
  </section>`;

const metroMarkup = (item) => {
  const laneCount = Math.max(1, ...item.workflowGroups.map((group) => (group.lane ?? 0) + 1));
  const branching = laneCount > 1;
  const routes = item.workflowGroups.map((group, index) => {
    const lane = group.lane ?? 0;
    const color = branching ? lane : index;
    return `
      <section class="metro-route" data-lane="${lane}" data-color="${color}">
        <span class="metro-junction" aria-hidden="true"></span>
        <h3>${escapeHtml(group.title)}<span class="metro-script" title="${escapeHtml(group.script)}">${escapeHtml(group.scriptLabel || group.script)}<br>${escapeHtml(group.status)}</span></h3>
        <div class="metro-track"><span class="metro-track-axis" aria-hidden="true"></span>${group.steps.map((step) => `<div class="metro-station">${escapeHtml(step)}</div>`).join("")}</div>
      </section>`;
  }).join("");
  return `
    <div class="metro-map metro-lanes-${laneCount}" aria-label="Code and data flow for ${escapeHtml(item.title)}">
      <svg class="metro-network" aria-hidden="true"><g></g></svg>
      <div class="metro-cap"><span class="metro-port" aria-hidden="true"></span></div>
      <div class="metro-routes">
        ${routes}
      </div>
      <div class="metro-cap"><span class="metro-port" aria-hidden="true"></span></div>
    </div>`;
};

const svgElement = (name) => document.createElementNS("http://www.w3.org/2000/svg", name);

const drawMetroNetworks = () => {
  $$(".metro-map", detailContent).forEach((map) => {
    const network = $(".metro-network", map);
    const layer = $("g", network);
    const routesRoot = $(".metro-routes", map);
    const ports = $$(".metro-port", map);
    const routes = $$(".metro-route", map);
    if (!network || !layer || !routesRoot || ports.length !== 2 || !routes.length) return;

    const mapRect = map.getBoundingClientRect();
    const routesRect = routesRoot.getBoundingClientRect();
    const center = (element) => {
      const rect = element.getBoundingClientRect();
      return [rect.left - mapRect.left + rect.width / 2, rect.top - mapRect.top + rect.height / 2];
    };
    const input = center(ports[0]);
    const output = center(ports[1]);
    const top = routesRect.top - mapRect.top;
    const bottom = routesRect.bottom - mapRect.top;
    const lanes = new Map();

    routes.forEach((route) => {
      const lane = Number(route.dataset.lane || 0);
      if (!lanes.has(lane)) lanes.set(lane, center($(".metro-junction", route))[0]);
    });

    network.setAttribute("viewBox", `0 0 ${map.clientWidth} ${map.clientHeight}`);
    layer.replaceChildren();

    [...lanes.entries()].sort(([a], [b]) => a - b).forEach(([lane, laneX]) => {
      const path = svgElement("path");
      path.setAttribute("d", [
        `M${input[0]} ${input[1]}`,
        `L${laneX} ${top}`,
        `L${laneX} ${bottom}`,
        `L${output[0]} ${output[1]}`
      ].join(" "));
      path.setAttribute("class", "metro-line");
      path.dataset.color = String(lane);
      layer.append(path);
    });

    routes.forEach((route) => {
      const junction = center($(".metro-junction", route));
      const track = center($(".metro-track-axis", route));
      const path = svgElement("path");
      path.setAttribute("d", `M${junction[0]} ${junction[1]} H${track[0]}`);
      path.setAttribute("class", "metro-branch-link");
      path.dataset.color = route.dataset.color;
      layer.append(path);
    });
  });
};

const detailMarkup = (item) => `
  <h2>${escapeHtml(item.title)}</h2>
  ${ioMarkup(item)}
  <section class="method-block"><span class="section-label">Frameworks</span><ul class="tool-list">${item.tools.map((tool) => {
    const runtime = toolRuntime(tool);
    return `<li data-runtime="${runtime}" aria-label="${escapeHtml(tool)}, ${runtimeNames[runtime]}"><span class="runtime-mark" aria-hidden="true">${runtimeLabels[runtime]}</span><span>${escapeHtml(tool)}</span></li>`;
  }).join("")}</ul></section>
  <section class="details-section"><span class="section-label">Representative outputs</span>${outputsMarkup(item)}</section>
  <section class="details-section metro-details"><span class="section-label">Workflow</span>${metroMarkup(item)}</section>`;

const wireDetails = () => {
  $$(".output-button", detailContent).forEach((button) => button.addEventListener("click", () => openLightbox(button)));
};

let metroFrame = 0;
const scheduleMetroNetworks = () => {
  cancelAnimationFrame(metroFrame);
  metroFrame = requestAnimationFrame(drawMetroNetworks);
};

let connectionFrame = 0;
const scheduleConnections = () => {
  cancelAnimationFrame(connectionFrame);
  connectionFrame = requestAnimationFrame(drawConnections);
};

const openDetail = (id, trigger) => {
  const item = workflowData[id];
  if (!item) return;
  if (selected === id) { closeDetail(true); return; }
  selected = id;
  lastTrigger = trigger;
  detail.dataset.lane = item.role.startsWith("ATAC") ? "atac" : item.role.startsWith("scRNA") ? "scrna" : item.role.startsWith("MPRA") ? "mpra" : "shared";
  nodes.forEach((node) => node.setAttribute("aria-expanded", String(node.dataset.node === id)));
  detailContent.innerHTML = detailMarkup(item);
  detail.hidden = false;
  workspace.classList.add("has-detail");
  wireDetails();
  scheduleMetroNetworks();
  scheduleConnections();
};

const navigateDetail = (direction) => {
  if (!selected) return;
  const currentIndex = nodes.findIndex((node) => node.dataset.node === selected);
  const nextIndex = (currentIndex + direction + nodes.length) % nodes.length;
  const target = nodes[nextIndex];
  openDetail(target.dataset.node, target);
  detailContent.scrollTop = 0;
};

const closeDetail = (restoreFocus = false) => {
  selected = null;
  detail.hidden = true;
  delete detail.dataset.lane;
  detailContent.innerHTML = "";
  workspace.classList.remove("has-detail");
  nodes.forEach((node) => node.setAttribute("aria-expanded", "false"));
  scheduleConnections();
  if (restoreFocus) lastTrigger?.focus({ preventScroll: true });
};

const openLightbox = (button) => {
  lastFigureTrigger = button;
  lightboxImage.src = button.dataset.src;
  lightboxImage.alt = button.dataset.alt;
  lightboxCaption.textContent = button.dataset.caption;
  lightbox.hidden = false;
  $(".lightbox-close", lightbox).focus();
};

const closeLightbox = () => {
  lightbox.hidden = true;
  lightboxImage.src = "";
  lastFigureTrigger?.focus();
};

nodes.forEach((node, index) => {
  node.addEventListener("click", () => openDetail(node.dataset.node, node));
  node.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const delta = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
    nodes[(index + delta + nodes.length) % nodes.length].focus();
  });
});

closeButton.addEventListener("click", () => closeDetail(true));
previousButton.addEventListener("click", () => navigateDetail(-1));
nextButton.addEventListener("click", () => navigateDetail(1));
$(".lightbox-close", lightbox).addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (event) => { if (event.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!lightbox.hidden) { closeLightbox(); return; }
  if (selected) closeDetail(true);
});

if (window.matchMedia("(min-width: 761px)").matches) {
  openDetail("atac_integrate");
}

new ResizeObserver(scheduleConnections).observe(diagram);
new ResizeObserver(scheduleMetroNetworks).observe(detail);
window.addEventListener("load", () => { scheduleConnections(); scheduleMetroNetworks(); }, { once: true });
drawConnections();
