import { MOTION_READY_CLASS } from "@/lib/motion/tokens";

/**
 * Runs synchronously in the document, before the storefront paints.
 *
 * Hidden start states (`opacity: 0`, closed `clip-path`) hang off the
 * `.motion-ready` class rather than being the CSS default. That ordering is
 * the whole point:
 *
 *   - no JS, or a motion chunk that never arrives  -> the class is never set,
 *     every element renders in place, the page is a normal static page;
 *   - class set here, before first paint           -> no flash of visible
 *     content collapsing into its hidden state, which is what happens if the
 *     class is added from a React effect after hydration.
 *
 * The failsafe covers the third case: the class is set, but MotionProvider
 * never boots (chunk 404, a throw during hydration). After four seconds the
 * class is pulled and the page becomes readable on its own. MotionProvider
 * clears the timer as soon as it is alive.
 *
 * Reduced motion never gets the class at all — there is nothing to reveal.
 */
export const MOTION_BOOT_SCRIPT = `(function(){try{
if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
var r=document.documentElement;
r.classList.add("${MOTION_READY_CLASS}");
window.__ssMotionFailsafe=window.setTimeout(function(){
r.classList.remove("${MOTION_READY_CLASS}");window.__ssMotionFailsafe=0;},4000);
}catch(e){}})();`;
