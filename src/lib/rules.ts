import type { Browser } from 'wxt/browser';
import { SEARCH_HOSTS } from './hosts';
import type { Settings } from './settings';

type Rule = Browser.declarativeNetRequest.Rule;
type QueryTransform = Browser.declarativeNetRequest.QueryTransform;

// The browser types model these as enums; Firefox does not guarantee the enum objects at runtime.
const MAIN_FRAME = 'main_frame' as Browser.declarativeNetRequest.ResourceType;
const ALLOW = { type: 'allow' as Browser.declarativeNetRequest.RuleActionType };
const REDIRECT = 'redirect' as Browser.declarativeNetRequest.RuleActionType;

// Dynamic rule IDs. Priorities: pause (session) > block AI Mode > keep tab choice > add Web filter.
export const RULE_ID = { blockAiMode: 1, keepTabChoice: 2, addWebFilter: 3 } as const;
const PAUSE_ID_OFFSET = 1000;
const PAUSE_PRIORITY = 100;

const SEARCH = String.raw`^https://[^/]+/search\?`;
const param = (name: string) => `${SEARCH}(?:[^#]*&)?${name}=`;
export const PATTERNS = {
  search: SEARCH,
  // A tab or vertical the user picked (udm, tbm), Jobs and Events (ibp), I'm Feeling Lucky (btnI).
  hasTabParam: param('(?:udm|tbm|ibp|btnI)'),
  aiMode: `${param('udm')}50(?:[&#]|$)`,
};

const WEB_FILTER: QueryTransform = { addOrReplaceParams: [{ key: 'udm', value: '14' }] };

function rule(id: number, priority: number, regexFilter: string, action: Rule['action']): Rule {
  return {
    id,
    priority,
    action,
    condition: {
      regexFilter,
      requestDomains: [...SEARCH_HOSTS],
      resourceTypes: [MAIN_FRAME],
    },
  };
}

const redirect = (queryTransform: QueryTransform): Rule['action'] => ({
  type: REDIRECT,
  redirect: { transform: { queryTransform } },
});

/** The full set of dynamic rules for the given settings. Rules only touch top-level /search loads. */
export function buildRules(settings: Settings): Rule[] {
  if (settings.mode === 'off') return [];
  const webOnly = settings.mode === 'webOnly';
  const rules: Rule[] = [];
  if (settings.blockAiMode) {
    rules.push(
      rule(
        RULE_ID.blockAiMode,
        3,
        PATTERNS.aiMode,
        redirect(webOnly ? WEB_FILTER : { removeParams: ['udm'] }),
      ),
    );
  }
  if (webOnly) {
    rules.push(
      // The user already picked a tab (Images, News, Web, ...): leave it alone.
      rule(RULE_ID.keepTabChoice, 2, PATTERNS.hasTabParam, ALLOW),
      rule(RULE_ID.addWebFilter, 1, PATTERNS.search, redirect(WEB_FILTER)),
    );
  }
  return rules;
}

export const pauseRuleId = (tabId: number) => PAUSE_ID_OFFSET + tabId;

/** Session rule that switches all PlainSight redirects off for one tab. */
export function pauseRule(tabId: number): Rule {
  return {
    id: pauseRuleId(tabId),
    priority: PAUSE_PRIORITY,
    action: ALLOW,
    condition: {
      tabIds: [tabId],
      resourceTypes: [MAIN_FRAME],
    },
  };
}
