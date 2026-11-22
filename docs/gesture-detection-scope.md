# Decision: gesture detection is rule-based, with no AI model work

Status: accepted, revisable. Date: 2026-11-22.

## Context

The submission manual excludes AI model development, training, serving and evaluation.
The original concept recognises a voluntary gesture from a webcam, which sounds like a
vision model. The architecture, however, already splits the work:

- The GEST backend service is a **registry**: it records which gesture types and engine
  versions exist and which ones a station can detect. It never sees video.
- Video capture, landmark extraction and classification live on the patient station
  (frontend), outside any backend service.

## Decision

For this project, detection means **fixed rules on landmarks that already exist**:

- The input is a file of face landmark coordinates per frame (synthetic, see
  [success-bar.md](success-bar.md)). The project does not capture video and does not run a
  landmark extractor.
- A double blink is a rule: the eye-openness value drops below a threshold twice inside a
  time window. Thresholds are plain configuration.
- No model is trained, fine-tuned, evaluated, benchmarked or served. No dataset of faces
  is collected.
- Other gesture types (for example an eyebrow raise) follow the same pattern: a rule on a
  landmark distance, or they stay out of scope.

## Consequences

- The success bar can run offline on a desktop with no GPU.
- Detection quality on real faces is **not** claimed. The project proves the pipeline from
  gesture to alarm, not recognition accuracy.
- A real landmark extractor could be plugged in later behind the same input format.

## Open question for the program contact

The rule-based approach should sit outside the AI exclusion, but the manual does not say
how it treats rules on landmarks. Draft message, to be sent by the project owner:

> My project turns a patient's double blink into a caregiver alarm. Detection is a fixed
> rule (eye-openness below a threshold twice in a window) applied to a pre-recorded,
> synthetic file of face landmarks. I train, evaluate and serve no model, and use no real
> faces. Is this acceptable under the rule against AI model development?

## Revisit when

The contact says rules on landmarks count as AI work. Then the gesture source would
change to a simulated signal, such as a scripted "blink" event, and the rule stays only
as a test of the alarm path.
