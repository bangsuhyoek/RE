package com.submate.app.webguide.target;

import android.net.Uri;
import android.webkit.WebView;

import com.submate.app.webguide.WebSecurityPolicy;

import org.json.JSONObject;
import org.json.JSONTokener;

import java.util.List;

public final class TargetResolver {
    public interface Callback {
        void onResolved(TargetResolution resolution);
    }

    private final WebSecurityPolicy securityPolicy;

    public TargetResolver(WebSecurityPolicy securityPolicy) {
        this.securityPolicy = securityPolicy;
    }

    public void resolve(WebView webView, GuideTargetSpec spec, Callback callback) {
        if (callback == null) return;
        if (webView == null || spec == null) {
            callback.onResolved(new TargetResolution(
                    TargetResolutionStatus.ERROR, null, 0, "", "", "", "invalid_arguments"));
            return;
        }

        Uri currentUri = safeUri(webView.getUrl());
        if (!securityPolicy.isAllowedHttpUrl(currentUri)) {
            callback.onResolved(new TargetResolution(
                    TargetResolutionStatus.ERROR, null, 0, "", "", "", "url_not_allowlisted"));
            return;
        }

        JSONObject target = new JSONObject();
        try {
            put(target, "selector", spec.getSelector());
            put(target, "id", spec.getElementId());
            put(target, "className", spec.getClassName());
            put(target, "text", spec.getText());
            put(target, "ariaLabel", spec.getAriaLabel());
            put(target, "role", spec.getRole());
            put(target, "hrefContains", spec.getHrefContains());
            put(target, "dataName", spec.getDataAttributeName());
            put(target, "dataValue", spec.getDataAttributeValue());
        } catch (Exception e) {
            callback.onResolved(new TargetResolution(
                    TargetResolutionStatus.ERROR, null, 0, "", "", "", "spec_serialization_failed"));
            return;
        }

        String script = buildScript(target.toString());
        webView.evaluateJavascript(script, rawValue -> {
            try {
                String json = unwrapJavascriptString(rawValue);
                if (json == null || json.trim().isEmpty() || "null".equals(json)) {
                    callback.onResolved(new TargetResolution(
                            TargetResolutionStatus.ERROR, null, 0, "", "", "", "empty_result"));
                    return;
                }

                JSONObject obj = new JSONObject(json);
                TargetResolutionStatus status = TargetResolutionStatus.valueOf(
                        obj.optString("status", TargetResolutionStatus.ERROR.name()));
                TargetRect rect = null;
                if (obj.has("left") && obj.has("top") && obj.has("width") && obj.has("height")) {
                    rect = new TargetRect(
                            (float) obj.optDouble("left", 0),
                            (float) obj.optDouble("top", 0),
                            (float) obj.optDouble("width", 0),
                            (float) obj.optDouble("height", 0),
                            (float) obj.optDouble("vw", 0),
                            (float) obj.optDouble("vh", 0)
                    );
                }

                callback.onResolved(new TargetResolution(
                        status,
                        rect,
                        obj.optInt("candidateCount", 0),
                        obj.optString("matchedText", ""),
                        obj.optString("matchedSelector", ""),
                        obj.optString("element", ""),
                        obj.optString("error", "")
                ));
            } catch (Exception e) {
                callback.onResolved(new TargetResolution(
                        TargetResolutionStatus.ERROR, null, 0, "", "", "", "result_parse_failed"));
            }
        });
    }

    public void resolveBySelectors(WebView webView, List<String> orderedSelectors, Callback callback) {
        if (callback == null) return;
        if (orderedSelectors == null || orderedSelectors.isEmpty()) {
            callback.onResolved(new TargetResolution(
                    TargetResolutionStatus.NOT_FOUND, null, 0, "", "", "", ""));
            return;
        }
        resolveSelectorAt(webView, orderedSelectors, 0, callback);
    }

    private void resolveSelectorAt(
            WebView webView,
            List<String> selectors,
            int index,
            Callback callback
    ) {
        if (index >= selectors.size()) {
            callback.onResolved(new TargetResolution(
                    TargetResolutionStatus.NOT_FOUND, null, 0, "", "", "", ""));
            return;
        }
        GuideTargetSpec spec = new GuideTargetSpec(
                selectors.get(index), null, null, null, null, null, null, null, null);
        resolve(webView, spec, result -> {
            if (result.getStatus() == TargetResolutionStatus.NOT_FOUND) {
                resolveSelectorAt(webView, selectors, index + 1, callback);
            } else {
                callback.onResolved(result);
            }
        });
    }

    private static void put(JSONObject object, String key, String value) throws Exception {
        if (value != null && !value.trim().isEmpty()) object.put(key, value);
    }

    private static Uri safeUri(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        try {
            return Uri.parse(value);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String unwrapJavascriptString(String rawValue) throws Exception {
        if (rawValue == null || "null".equals(rawValue)) return null;
        if (rawValue.startsWith("\"") && rawValue.endsWith("\"")) {
            Object value = new JSONTokener(rawValue).nextValue();
            return value == null ? null : value.toString();
        }
        return rawValue;
    }

    private static String buildScript(String targetJson) {
        return "(function(){" +
                "try{" +
                "var spec=" + targetJson + ";" +
                "var norm=function(v){return (v||'').replace(/\\s+/g,' ').trim();};" +
                "var esc=function(v){try{return CSS.escape(v);}catch(e){return String(v).replace(/([\\.#:[\\],>+~*^$|=()])/g,'\\\\$1');}};" +
                "var pool=[];var seen=[];" +
                "var push=function(el,reason){if(!el||el.nodeType!==1)return;if(seen.indexOf(el)>=0)return;seen.push(el);pool.push({el:el,reason:reason});};" +
                "var addAll=function(list,reason){for(var i=0;i<list.length;i++)push(list[i],reason);};" +
                "if(spec.selector){try{addAll(document.querySelectorAll(spec.selector),'selector:'+spec.selector);}catch(e){return JSON.stringify({status:'ERROR',error:'invalid_selector'});}}" +
                "if(spec.id){var byId=document.getElementById(spec.id);if(byId)push(byId,'id');}" +
                "if(spec.className){try{addAll(document.getElementsByClassName(spec.className),'class');}catch(e){}}" +
                "var clickables=document.querySelectorAll('a,button,[role=\"button\"],[role=\"link\"],[onclick],[tabindex],input[type=\"button\"],input[type=\"submit\"]');" +
                "if(spec.text){for(var i=0;i<clickables.length;i++){if(norm(clickables[i].innerText||clickables[i].textContent)===norm(spec.text))push(clickables[i],'text');}}" +
                "if(spec.ariaLabel){var aria=document.querySelectorAll('[aria-label]');for(var i=0;i<aria.length;i++){if(norm(aria[i].getAttribute('aria-label'))===norm(spec.ariaLabel))push(aria[i],'aria-label');}}" +
                "if(spec.role){var roles=document.querySelectorAll('[role]');for(var i=0;i<roles.length;i++){if(norm(roles[i].getAttribute('role'))===norm(spec.role))push(roles[i],'role');}}" +
                "if(spec.hrefContains){var links=document.querySelectorAll('a[href]');for(var i=0;i<links.length;i++){if((links[i].getAttribute('href')||'').indexOf(spec.hrefContains)>=0)push(links[i],'href');}}" +
                "if(spec.dataName&&/^data-[a-zA-Z0-9_-]+$/.test(spec.dataName)){var dataEls=document.querySelectorAll('['+spec.dataName+']');for(var i=0;i<dataEls.length;i++){if(!spec.dataValue||norm(dataEls[i].getAttribute(spec.dataName))===norm(spec.dataValue))push(dataEls[i],'data');}}" +
                "if(pool.length===0&&spec.text){" +
                "var all=document.querySelectorAll('body *');" +
                "for(var i=0;i<all.length;i++){if(norm(all[i].textContent)===norm(spec.text)){var c=all[i].closest('a,button,[role=\"button\"],[role=\"link\"],[onclick],[tabindex]');push(c||all[i],'text-descendant');}}" +
                "}" +
                "var matches=[];" +
                "var matchAll=function(el){" +
                "if(spec.selector){try{if(!el.matches(spec.selector))return false;}catch(e){return false;}}" +
                "if(spec.id&&el.id!==spec.id)return false;" +
                "if(spec.className&&!el.classList.contains(spec.className))return false;" +
                "if(spec.text&&norm(el.innerText||el.textContent)!==norm(spec.text))return false;" +
                "if(spec.ariaLabel&&norm(el.getAttribute('aria-label'))!==norm(spec.ariaLabel))return false;" +
                "if(spec.role&&norm(el.getAttribute('role'))!==norm(spec.role))return false;" +
                "if(spec.hrefContains&&String(el.getAttribute('href')||'').indexOf(spec.hrefContains)<0)return false;" +
                "if(spec.dataName&&spec.dataValue&&norm(el.getAttribute(spec.dataName))!==norm(spec.dataValue))return false;" +
                "return true;};" +
                "for(var i=0;i<pool.length;i++){var el=pool[i].el;if(!matchAll(el))continue;var r=el.getBoundingClientRect();var s=window.getComputedStyle(el);if(!r||r.width<=0||r.height<=0||s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity||'1')===0)continue;matches.push({el:el,reason:pool[i].reason,rect:r});}" +
                "if(matches.length===0)return JSON.stringify({status:'NOT_FOUND',candidateCount:0});" +
                "var vw=window.innerWidth||document.documentElement.clientWidth||0;var vh=window.innerHeight||document.documentElement.clientHeight||0;" +
                "var visible=[];for(var i=0;i<matches.length;i++){var r=matches[i].rect;if(r.right>0&&r.bottom>0&&r.left<vw&&r.top<vh)visible.push(matches[i]);}" +
                "var chosen=null;" +
                "if(visible.length===1){chosen=visible[0];}" +
                "else if(visible.length>1){return JSON.stringify({status:'AMBIGUOUS',candidateCount:matches.length});}" +
                "else if(matches.length===1){chosen=matches[0];}" +
                "else{return JSON.stringify({status:'AMBIGUOUS',candidateCount:matches.length});}" +
                "var r=chosen.rect;var el=chosen.el;var desc=el.tagName.toLowerCase();if(el.id)desc+='#'+el.id;if(el.classList&&el.classList.length)desc+='.'+Array.prototype.slice.call(el.classList,0,2).join('.');" +
                "var isVisible=(r.right>0&&r.bottom>0&&r.left<vw&&r.top<vh);" +
                "if(isVisible){var cx=Math.max(0,Math.min(vw-1,r.left+r.width/2));var cy=Math.max(0,Math.min(vh-1,r.top+r.height/2));var hit=document.elementFromPoint(cx,cy);if(hit&&hit!==el&&!el.contains(hit)){return JSON.stringify({status:'ERROR',candidateCount:matches.length,error:'target_occluded',matchedText:norm(el.innerText||el.textContent).slice(0,80),matchedSelector:chosen.reason,element:desc});}}" +
                "return JSON.stringify({status:isVisible?'FOUND_VISIBLE':'FOUND_OFFSCREEN',candidateCount:matches.length,left:r.left,top:r.top,width:r.width,height:r.height,vw:vw,vh:vh,matchedText:norm(el.innerText||el.textContent).slice(0,80),matchedSelector:chosen.reason,element:desc});" +
                "}catch(e){return JSON.stringify({status:'ERROR',candidateCount:0,error:String(e&&e.message?e.message:e).slice(0,120)});}" +
                "})()";
    }
}
