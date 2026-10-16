/**
 * library-metadata: the name and description of a block library sample (docs/library/blocks/*).
 * The DA Library panel reads them from the source document; on the rendered page they are
 * hidden so editors previewing the library only see the samples.
 */
export default function decorate(block) {
  const wrapper = block.closest('.library-metadata-wrapper') || block;
  wrapper.hidden = true;
}
