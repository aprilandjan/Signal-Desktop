// Copyright 2018 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

import React from 'react';

import { SystemMessage } from './SystemMessage';
import { ContactName } from './ContactName';
import { Intl } from '../Intl';
import type { LocalizerType } from '../../types/Util';

import { missingCaseError } from '../../util/missingCaseError';

type Contact = { title: string };

export type PropsData = {
  type: 'markVerified' | 'markNotVerified';
  isLocal: boolean;
  contact: Contact;
};

type PropsHousekeeping = {
  i18n: LocalizerType;
};

export type Props = PropsData & PropsHousekeeping;

export class VerificationNotification extends React.Component<Props> {
  public renderContents(): JSX.Element {
    const { contact, isLocal, type, i18n } = this.props;

    const name = (
      <ContactName
        key="external-1"
        title={contact.title}
        module="module-verification-notification__contact"
      />
    );

    switch (type) {
      case 'markVerified':
        return isLocal ? (
          <Intl
            id="icu:youMarkedAsVerified"
            components={{ name }}
            i18n={i18n}
          />
        ) : (
          <Intl
            id="icu:youMarkedAsVerifiedOtherDevice"
            components={{ name }}
            i18n={i18n}
          />
        );
      case 'markNotVerified':
        return isLocal ? (
          <Intl
            id="icu:youMarkedAsNotVerified"
            components={{ name }}
            i18n={i18n}
          />
        ) : (
          <Intl
            id="icu:youMarkedAsNotVerifiedOtherDevice"
            components={{ name }}
            i18n={i18n}
          />
        );
      default:
        throw missingCaseError(type);
    }
  }

  public override render(): JSX.Element {
    const { type } = this.props;
    const icon = type === 'markVerified' ? 'verified' : 'verified-not';

    return <SystemMessage icon={icon} contents={this.renderContents()} />;
  }
}
