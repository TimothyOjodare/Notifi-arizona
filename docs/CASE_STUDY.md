# Case Study — Carlos Hernandez

> A walkthrough of a single reportable-disease case from clinician-encounter to case-closure, demonstrating the four-claim thesis of NotifiAZ. All names, demographics, and clinical details are synthetic. Any resemblance to real patients is coincidental.

## The case

**Carlos Hernandez** is a 47-year-old Hispanic man living in Glendale, AZ (Maricopa County, ZIP 85301). He works in landscaping, primarily on residential properties in the Phoenix metro. On April 4, 2026, he presents to the Banner Health Phoenix outpatient clinic with a chief complaint of progressive cough x 3 weeks, low-grade fever, fatigue, and night sweats. He reports significant exposure to wind-blown soil dust during recent yard-work jobs.

His attending is **Dr. Anika Patel**, a Family Medicine physician at Banner Health Phoenix. She orders Coccidioides serology on April 4. The lab returns on April 7: Coccidioides IgM positive, Coccidioides IgG positive at 1:64. Diagnosis: **Coccidioidomycosis** (Valley Fever, ICD-10 B38.9, SNOMED-CT 65295007).

Coccidioidomycosis is a reportable disease in Arizona under R9-6-202. ADHS classifies it as routine surveillance. The destinations that need the report are:

- **Arizona Department of Health Services** (via MEDSIS, HL7 v2.5.1 ELR)
- **Maricopa County Department of Public Health** (via the local JSON endpoint)
- **CDC NNDSS** (via NNDSS Modernization Initiative v2)

Mr. Hernandez does not live on tribal land, so no tribal-health-authority destination applies. The disease is not animal-side, so no APHIS/ADA/AGFD destinations apply.

## Today's workflow (without NotifiAZ)

Without an integrated reporting system, here is what Dr. Patel's day looks like after the lab returns:

**Day 1 (the day the lab returns):** Dr. Patel sees the abnormal IgM/IgG result in her queue. She is between patients. She knows Cocci is reportable but she is unsure of the exact ADHS deadline for routine surveillance reports (it is one business day; she remembers it is "a few days"). She flags the chart for her clinic's reporting nurse to handle. The reporting nurse is part-time; she is in the office Tuesday and Thursday.

**Day 2:** The chart sits.

**Day 3 (Tuesday, the reporting nurse's day):** The nurse opens ADHS-MEDSIS in one browser tab, the patient's chart in another, the Maricopa County reporting portal in a third. She begins retyping. Patient demographics — name, date of birth, address, phone — into MEDSIS. Then again into Maricopa County's portal. The CDC NNDSS submission is handled at the state level (ADHS forwards), so she skips that one. She does not know whether Coccidioidomycosis on a Hispanic patient living in Glendale is associated with any tribal-affiliation flag (it is not, but she has to verify). She copies the lab values from the lab system into MEDSIS. She copies the encounter date. She copies the assessment. The exposure history field on the MEDSIS form asks about occupational soil-dust exposure — she scrolls the chart looking for it. The HPI mentions "wind-blown soil dust during recent yard-work jobs," which is enough but not in a structured field. She types a free-text note. She submits to MEDSIS. She submits to Maricopa County. **Total elapsed: 47 minutes.**

**Day 7:** A Maricopa County investigator emails the practice. She needs three additional fields not on the original report: the patient's specific ZIP-code-level address (she has the city), the dates of the patient's recent yard-work jobs, and whether any household contacts are symptomatic. The reporting nurse pulls the chart, replies to the email. **Another 18 minutes.**

**Day 14:** The case is quietly closed in MEDSIS. Neither Dr. Patel nor the reporting nurse is notified. They have no idea that this case was the seventeenth Coccidioidomycosis report from Maricopa County in the same week, that Maricopa County PH is tracking a cluster, that the cluster appears to be associated with a recent dust storm event, or that the county is preparing a public-health advisory for landscapers. The clinician does not learn anything from filing the report. The next time Dr. Patel sees a possible Cocci case, the math in her head is: file the report, lose 65 minutes of staff time, get nothing back.

This is the seventy percent that never gets filed.

## With NotifiAZ

**The same day the lab returns, between patients, Dr. Patel opens the chart.**

The chart's reportable-disease banner is red. She has not done anything yet — the system has recognized that the active problem list contains an ICD-10 code that maps to a reportable disease in Arizona and has flagged it.

She clicks **📋 File reportable disease report**.

The reporter view loads. The patient demographics, encounter date, assessment, lab results, and exposure history are pre-filled from the FHIR record. The destinations are computed and shown:

- **ADHS** (HL7 v2.5.1 ELR, CDC ELR IG r1.1 + AZ extensions)
- **Maricopa County PH** (local JSON, MCDPH Reportable Disease v1.0)
- **CDC NNDSS** (NNDSS Modernization Initiative v2)

She clicks **Preview** on the ADHS card. The HL7 message renders. She reads the MSH, the PID, the OBR with the SNOMED code, the OBX segments for the IgM and IgG labs, and the NTE segment carrying her exposure-history note: *occupational soil-dust exposure during landscaping work x 3 weeks prior to onset*. She nods. She clicks Hide.

She clicks **⚡ Submit to all 3 agencies**.

Three acknowledgement IDs return — one from ADHS (`ACK-7A2F1E8B...`), one from Maricopa County (`ACK-9D4C2F1A...`), one from CDC NNDSS (`ACK-3E7B5D9C...`). The whole workflow, from opening the chart to seeing the acknowledgements: **3 minutes 40 seconds.**

**The next day**, Dr. Patel signs back into NotifiAZ to file an unrelated report. Her "My filed reports" side panel shows the Hernandez case. The Maricopa County card has an amber **CALLBACK PENDING** badge. She expands it. The Maricopa County investigator has asked: *"Can you confirm the patient's exact yard-work locations in the 14 days prior to onset? We're tracking a Glendale-area cluster and need ZIP-code-level exposure data."*

She types a reply: *"Patient reports three job sites all within ZIP 85301: 4400 W Glendale Ave (4/1), 5821 N 67th Ave (3/29), 4233 W Cactus Rd (3/27). All residential properties with active landscaping (loose soil)."* She clicks **Send reply**. **Total time: 90 seconds.**

**Three days later**, Dr. Patel signs in again. The Hernandez card now shows **CLOSED** with a sage-green border. The Maricopa County investigator has closed the case with this note: *"Case is the 17th Cocci report from Maricopa County in 14 days. Cluster of 6 cases shares ZIP 85301 yard-work exposure. Public-health advisory issued to county landscaping employers 4/14. Thank you for the geo-precision in your reply — your case sites helped us isolate the cluster."*

Dr. Patel sees this. She closes her laptop. **The next time she sees a possible Cocci case, the math in her head is different.**

## What changed

| | Without NotifiAZ | With NotifiAZ |
|---|---|---|
| Time to file initial report | 47 min (3 days later) | 3:40 (same-day) |
| Callbacks from agencies | 1 callback, 18 min to resolve | 1 callback, 1:30 to resolve |
| Total staff time on this case | ~65 min over 7 days | ~5 min over 4 days |
| Did the clinician learn what happened? | No | Yes — case is the 17th Cocci report; cluster identified; advisory issued |
| Was the report complete on first submission? | No (3 fields missing) | Yes (every required field validated) |
| Did the report make it to all required destinations? | 2 of 3 (CDC was forwarded by ADHS; ADHS was 3 days late) | 3 of 3, same-day |

## What this case study illustrates

This case is unremarkable — it is a routine Coccidioidomycosis report on a Hispanic landscape worker in Maricopa County. There are thousands like it every year in Arizona. The point of the case study is not that NotifiAZ does something exotic for an exotic case. The point is that NotifiAZ does the *unremarkable* case in four minutes instead of an hour, completes it on first submission, routes it to every destination that needs it, and tells the clinician what their report contributed to.

If the workflow stays this fast and this complete, **the seventy percent that today never gets filed will start getting filed.** That is the public-health outcome NotifiAZ is built to produce. Not a model. Not a dashboard. A faster, completer, bidirectional workflow — applied to the case Dr. Patel was already seeing.

## Note on synthetic data

Carlos Hernandez does not exist. Dr. Anika Patel does not exist. Banner Health Phoenix is a real institution, but no agreement, partnership, or data-sharing arrangement with this project exists. Every clinical detail in this case study was generated for the purpose of demonstrating the workflow. See `SYNTHETIC_DATA_NOTICE.md` for the full disclosure.
