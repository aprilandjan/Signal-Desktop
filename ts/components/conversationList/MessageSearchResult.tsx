// Copyright 2019 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import type { FunctionComponent, ReactNode } from 'react';
import React, { useCallback } from 'react';
import { escapeRegExp } from 'lodash';

import { MessageBodyHighlight } from './MessageBodyHighlight';
import { ContactName } from '../conversation/ContactName';

import { assertDev } from '../../util/assert';
import type {
  HydratedBodyRangesType,
  LocalizerType,
  ThemeType,
} from '../../types/Util';
import { BaseConversationListItem } from './BaseConversationListItem';
import type {
  ConversationType,
  ShowConversationType,
} from '../../state/ducks/conversations';
import type { PreferredBadgeSelectorType } from '../../state/selectors/badges';
import { Intl } from '../Intl';

export type PropsDataType = {
  isSelected?: boolean;
  isSearchingInConversation?: boolean;

  id: string;
  conversationId: string;
  sentAt?: number;

  snippet: string;
  body: string;
  bodyRanges: HydratedBodyRangesType;

  from: Pick<
    ConversationType,
    | 'acceptedMessageRequest'
    | 'avatarPath'
    | 'badges'
    | 'color'
    | 'isMe'
    | 'phoneNumber'
    | 'profileName'
    | 'sharedGroupNames'
    | 'title'
    | 'type'
    | 'unblurredAvatarPath'
  >;

  to: Pick<
    ConversationType,
    'isMe' | 'phoneNumber' | 'profileName' | 'title' | 'type'
  >;
};

type PropsHousekeepingType = {
  getPreferredBadge: PreferredBadgeSelectorType;
  i18n: LocalizerType;
  showConversation: ShowConversationType;
  theme: ThemeType;
};

export type PropsType = PropsDataType & PropsHousekeepingType;

const renderPerson = (
  i18n: LocalizerType,
  person: Readonly<{
    isMe?: boolean;
    title: string;
  }>
): ReactNode =>
  person.isMe ? i18n('icu:you') : <ContactName title={person.title} />;

// This function exists because bodyRanges tells us the character position
// where the at-mention starts at according to the full body text. The snippet
// we get back is a portion of the text and we don't know where it starts. This
// function will find the relevant bodyRanges that apply to the snippet and
// then update the proper start position of each body range.
function getFilteredBodyRanges(
  snippet: string,
  body: string,
  bodyRanges: HydratedBodyRangesType
): HydratedBodyRangesType {
  if (!bodyRanges.length) {
    return [];
  }

  // Find where the snippet starts in the full text
  const stripped = snippet
    .replace(/<<left>>/g, '')
    .replace(/<<right>>/g, '')
    .replace(/^.../, '')
    .replace(/...$/, '');
  const rx = new RegExp(escapeRegExp(stripped));
  const match = rx.exec(body);

  assertDev(Boolean(match), `No match found for "${snippet}" inside "${body}"`);

  const delta = match ? match.index + snippet.length : 0;

  // Filters out the @mentions that are present inside the snippet
  const filteredBodyRanges = bodyRanges.filter(bodyRange => {
    return bodyRange.start < delta;
  });

  const snippetBodyRanges = [];
  const MENTIONS_REGEX = /\uFFFC/g;

  let bodyRangeMatch = MENTIONS_REGEX.exec(snippet);
  let i = 0;

  // Find the start position within the snippet so these can later be
  // encoded and rendered correctly.
  while (bodyRangeMatch) {
    const bodyRange = filteredBodyRanges[i];

    if (bodyRange) {
      snippetBodyRanges.push({
        ...bodyRange,
        start: bodyRangeMatch.index,
      });
    } else {
      assertDev(
        false,
        `Body range does not exist? Count: ${i}, Length: ${filteredBodyRanges.length}`
      );
    }

    bodyRangeMatch = MENTIONS_REGEX.exec(snippet);
    i += 1;
  }

  return snippetBodyRanges;
}

export const MessageSearchResult: FunctionComponent<PropsType> = React.memo(
  function MessageSearchResult({
    body,
    bodyRanges,
    conversationId,
    from,
    getPreferredBadge,
    i18n,
    id,
    sentAt,
    showConversation,
    snippet,
    theme,
    to,
  }) {
    const onClickItem = useCallback(() => {
      showConversation({ conversationId, messageId: id });
    }, [showConversation, conversationId, id]);

    if (!from || !to) {
      return <div />;
    }

    const isNoteToSelf = from.isMe && to.isMe;

    let headerName: ReactNode;
    if (isNoteToSelf) {
      headerName = i18n('icu:noteToSelf');
    } else if (from.isMe) {
      if (to.type === 'group') {
        headerName = (
          <span>
            <Intl
              i18n={i18n}
              id="icu:searchResultHeader--you-to-group"
              components={{
                receiverGroup: renderPerson(i18n, to),
              }}
            />
          </span>
        );
      } else {
        headerName = (
          <span>
            <Intl
              i18n={i18n}
              id="icu:searchResultHeader--you-to-receiver"
              components={{
                receiverContact: renderPerson(i18n, to),
              }}
            />
          </span>
        );
      }
    } else {
      // eslint-disable-next-line no-lonely-if
      if (to.type === 'group') {
        headerName = (
          <span>
            <Intl
              i18n={i18n}
              id="icu:searchResultHeader--sender-to-group"
              components={{
                sender: renderPerson(i18n, from),
                receiverGroup: renderPerson(i18n, to),
              }}
            />
          </span>
        );
      } else {
        headerName = (
          <span>
            <Intl
              i18n={i18n}
              id="icu:searchResultHeader--sender-to-you"
              components={{
                sender: renderPerson(i18n, from),
              }}
            />
          </span>
        );
      }
    }

    const snippetBodyRanges = getFilteredBodyRanges(snippet, body, bodyRanges);
    const messageText = (
      <MessageBodyHighlight
        text={snippet}
        bodyRanges={snippetBodyRanges}
        i18n={i18n}
      />
    );

    return (
      <BaseConversationListItem
        acceptedMessageRequest={from.acceptedMessageRequest}
        avatarPath={from.avatarPath}
        badge={getPreferredBadge(from.badges)}
        color={from.color}
        conversationType="direct"
        headerDate={sentAt}
        headerName={headerName}
        i18n={i18n}
        id={id}
        isNoteToSelf={isNoteToSelf}
        isMe={from.isMe}
        isSelected={false}
        messageText={messageText}
        onClick={onClickItem}
        phoneNumber={from.phoneNumber}
        profileName={from.profileName}
        sharedGroupNames={from.sharedGroupNames}
        theme={theme}
        title={from.title}
        unblurredAvatarPath={from.unblurredAvatarPath}
      />
    );
  }
);
