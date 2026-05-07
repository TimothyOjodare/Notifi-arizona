# NotifiAZ — Opening Pitch

**Length:** ~6:30 read aloud at conversational pace.
**Audience:** Certification panel.
**Use:** Read in full at the start of the presentation, before opening any slides.

---

In Arizona, the Department of Health Services estimates that roughly seventy percent of reportable infectious-disease cases never enter the surveillance system. That's not because clinicians don't care about public health. It's because the workflow to file a single reportable disease report takes between forty-five minutes and an hour for a busy primary-care doctor. The right form depends on the disease, the patient's residence, and whether the disease is also reportable to a federal agency or a tribal authority. The data the clinician submits is often incomplete, which means the agency has to call the practice back two or three days later to fill in fields that the EHR already had on file. And the clinician — having spent an hour filing the report and another fifteen minutes on a follow-up phone call — never finds out what happened to the case. They never hear that their report contributed to identifying a cluster. They never hear that contact tracing began. They never hear *anything*. So the next time a reportable disease walks through their door, the math in their head is: file the report, lose an hour of clinic time, get nothing back. So they don't file.

That's the seventy percent.

NotifiAZ is a piece of public-health infrastructure built around four claims, in order of importance:

**The first claim is that filing a reportable case should take four minutes, not forty-five.** Not because we cut corners — the report we generate is more complete than what gets filed today, not less — but because the data the EHR already has should never be retyped into a separate form. We pull the patient demographics, the encounter, the active diagnosis, the lab results, and the exposure history directly out of the FHIR record. The clinician confirms what we found. They submit. The whole loop, four minutes.

**The second claim is that the system should know which agencies need this disease for this patient.** The clinician should not have to remember that Coccidioidomycosis goes to ADHS and Pima County, that Tuberculosis additionally goes to CDC, that a measles case in a Navajo Nation resident goes to the tribal health authority *first* and only to the state with explicit tribal consent, that animal Rabies goes to USDA APHIS *and* the Arizona Department of Agriculture *and* triggers a parallel notification to ADHS for human-exposure surveillance. The system knows the disease, the system knows the patient's address, the system knows the species, the system routes to all of the right destinations in one action. The clinician picks the disease and confirms. We do the routing.

**The third claim is that the data we send is complete.** Every required field for every destination is validated against the receiving agency's spec before we hit send. ADHS won't be calling back asking for the patient's race code, because we sent the OMB-coded race field with the message. The CDC won't be calling back asking for the NNDSS condition code, because we looked it up from the disease database. Pima County won't be calling back asking for the encounter date, because that came from the EHR. Validation happens before submission. Zero callbacks for missing data.

**The fourth claim — and this is the one I think matters most over time — is that the system is bidirectional.** When the agency sends a callback question, the clinician sees it the next time they sign in. When the agency confirms receipt, the clinician sees that. When the agency closes the case with "this was the fourth report of Cocci in this zip code in seven days, we're tracking a cluster," the clinician sees *that*. Because if you ask a busy doctor to do an extra task and then never tell them whether it mattered, eventually they stop. But if you tell them — concretely, every time — what their report contributed to, you build the muscle memory that says: file the report, it's worth it.

What I'm going to demonstrate today is not a sketch and it's not a pitch deck. It's a working system. There are sixty synthetic patients across nine Arizona counties, eleven synthetic animals across four veterinary practices, and ten synthetic agency investigators across nine destination agencies — ADHS, CDC NNDSS, Pima and Maricopa County health departments, the Apache and Navajo Nation tribal health authorities, USDA APHIS Veterinary Services, the Arizona Department of Agriculture, and the Arizona Game and Fish Department. The reportable disease database carries seventy-two diseases with ICD-10, SNOMED, LOINC, and NNDSS condition codes. The message generator emits real HL7 v2.5.1 ELR for ADHS, real NNDSS condition-coded JSON for CDC, real USDA VSPS Form 1-A JSON for APHIS — all of it validated against the receiving agency's published specification.

I'm going to walk through three things: a clinician filing a report from inside a mock EHR; an agency investigator receiving that report and sending a callback; and the clinician receiving the callback and replying. The whole demonstration takes about eight minutes. By the end of it, you'll have seen one closed loop, two surfaces, seven destinations, and the bidirectional feedback that makes the workflow stick.

What I'm not going to demonstrate is everything that NotifiAZ is *not*. It is not a clinical decision support system. It is not a disease risk-prediction model. It is not a knowledge graph. It is not a federation manifest. It is not an environmental surveillance dashboard. Earlier versions of this project tried to be all of those things, and the panel was right to push back: a capstone that solves six problems is a capstone that solves none of them. NotifiAZ solves one problem, defended deeply.

That problem is reportable disease reporting. And the thesis is one sentence: reporting should take four minutes, route to every agency in one action, validate completely, and tell the clinician what happened next.

Let me show you.
