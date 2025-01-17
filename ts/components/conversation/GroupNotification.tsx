// Copyright 2018 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import type { ReactNode } from 'react';
import React from 'react';
import { compact, flatten } from 'lodash';

import { ContactName } from './ContactName';
import { SystemMessage } from './SystemMessage';
import { Intl } from '../Intl';
import type { LocalizerType } from '../../types/Util';

import { missingCaseError } from '../../util/missingCaseError';
import type { ConversationType } from '../../state/ducks/conversations';

export type ChangeType = 'add' | 'remove' | 'name' | 'avatar' | 'general';

type Change = {
  type: ChangeType;
  newName?: string;
  contacts?: Array<ConversationType>;
};

export type PropsData = {
  from: ConversationType;
  changes: Array<Change>;
};

type PropsHousekeeping = {
  i18n: LocalizerType;
};

export type Props = PropsData & PropsHousekeeping;

export class GroupNotification extends React.Component<Props> {
  public renderChange(
    change: Change,
    from: ConversationType
  ): JSX.Element | string | null | undefined {
    const { contacts, type, newName } = change;
    const { i18n } = this.props;

    const otherPeople: Array<JSX.Element> = compact(
      (contacts || []).map(contact => {
        if (contact.isMe) {
          return null;
        }

        return (
          <span
            key={`external-${contact.id}`}
            className="module-group-notification__contact"
          >
            <ContactName title={contact.title} />
          </span>
        );
      })
    );
    const otherPeopleWithCommas: Array<JSX.Element | string> = compact(
      flatten(
        otherPeople.map((person, index) => [index > 0 ? ', ' : null, person])
      )
    );
    const contactsIncludesMe = (contacts || []).length !== otherPeople.length;

    switch (type) {
      case 'name':
        return (
          <Intl
            i18n={i18n}
            id="icu:titleIsNow"
            components={{ name: newName || '' }}
          />
        );
      case 'avatar':
        return <Intl i18n={i18n} id="icu:updatedGroupAvatar" />;
      case 'add':
        if (!contacts || !contacts.length) {
          throw new Error('Group update is missing contacts');
        }

        return (
          <>
            {otherPeople.length > 0 && (
              <>
                {otherPeople.length === 1 ? (
                  <Intl
                    i18n={i18n}
                    id="icu:joinedTheGroup"
                    components={{ name: otherPeopleWithCommas }}
                  />
                ) : (
                  <Intl
                    i18n={i18n}
                    id="icu:multipleJoinedTheGroup"
                    components={{ names: otherPeopleWithCommas }}
                  />
                )}
              </>
            )}
            {contactsIncludesMe && (
              <div className="module-group-notification__change">
                <Intl i18n={i18n} id="icu:youJoinedTheGroup" />
              </div>
            )}
          </>
        );
      case 'remove':
        if (from && from.isMe) {
          return i18n('icu:youLeftTheGroup');
        }

        if (!contacts || !contacts.length) {
          throw new Error('Group update is missing contacts');
        }

        return contacts.length > 1 ? (
          <Intl
            id="icu:multipleLeftTheGroup"
            i18n={i18n}
            components={{ name: otherPeopleWithCommas }}
          />
        ) : (
          <Intl
            id="icu:leftTheGroup"
            i18n={i18n}
            components={{ name: otherPeopleWithCommas }}
          />
        );
      case 'general':
        return;
      default:
        throw missingCaseError(type);
    }
  }

  public override render(): JSX.Element {
    const { changes: rawChanges, i18n, from } = this.props;

    // This check is just to be extra careful, and can probably be removed.
    const changes: Array<Change> = Array.isArray(rawChanges) ? rawChanges : [];

    // Leave messages are always from the person leaving, so we omit the fromLabel if
    //   the change is a 'leave.'
    const firstChange: undefined | Change = changes[0];
    const isLeftOnly = changes.length === 1 && firstChange?.type === 'remove';

    const fromLabel = from.isMe ? (
      <Intl i18n={i18n} id="icu:youUpdatedTheGroup" />
    ) : (
      <Intl
        i18n={i18n}
        id="icu:updatedTheGroup"
        components={{ name: <ContactName title={from.title} /> }}
      />
    );

    let contents: ReactNode;
    if (isLeftOnly) {
      contents = this.renderChange(firstChange, from);
    } else {
      contents = (
        <>
          <p>{fromLabel}</p>
          {changes.map((change, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <p key={i} className="module-group-notification__change">
              {this.renderChange(change, from)}
            </p>
          ))}
        </>
      );
    }

    return <SystemMessage contents={contents} icon="group" />;
  }
}
