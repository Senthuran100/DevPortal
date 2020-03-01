/*
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Suspense, lazy } from 'react';
import { Route, Switch } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Configurations from 'Config';
import Settings from 'Settings';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import Logout from './app/components/Logout';
import Progress from './app/components/Shared/Progress';
import { SettingsProvider } from './app/components/Shared/SettingsContext';
import API from './app/data/api';
import BrowserRouter from './app/components/Base/CustomRouter/BrowserRouter';
import AuthManager from './app/data/AuthManager';
import Loading from './app/components/Base/Loading/Loading';
const protectedApp = lazy(() => import('./app/ProtectedApp' /* webpackChunkName: "ProtectedApp" */));

/**
 * Root DevPortal component
 *
 * @class DevPortal
 * @extends {React.Component}
 */
class DevPortal extends React.Component {
    /**
     *Creates an instance of DevPortal.
     * @param {*} props Properties passed from the parent component
     * @memberof DevPortal
     */
    constructor(props) {
        super(props);
        this.state = {
            settings: null,
            tenantDomain: null,
            theme: null,
            authresponse:false,
            externalidp:false,
        };
        this.SetTenantTheme = this.setTenantTheme.bind(this);
        this.setSettings = this.setSettings.bind(this);
    }

    /**
     *  Mounting the components
     */
    componentDidMount() {
        const api = new API();
        const promisedSettings = api.getSettings();
        promisedSettings
            .then((response) => {
                this.setSettings(response.body);
            })
            .then((response)=>{
                if (Settings.app.isPassive && !AuthManager.getUser() && !sessionStorage.getItem('notEnoughPermission') && !Settings.app.isNonAnonymous) {
                    this.checkLoginUser(this.state.settings.identityProvider.external);
                }
            })
            .catch((error) => {
                console.error(
                    'Error while receiving settings : ',
                    error,
                );
            });
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tenant') === null || urlParams.get('tenant') === 'carbon.super') {
            this.setState({ theme: Configurations.themes.light });
        } else {
            this.setTenantTheme(urlParams.get('tenant'));
        }
    }

    /**
     * Set the tenant domain to state
     * @param {String} tenantDomain tenant domain
     * @memberof DevPortal
     */
    setTenantDomain = (tenantDomain) => {
        this.setState({ tenantDomain });
        if (tenantDomain === 'carbon.super') {
            this.setState({ theme: Configurations.themes.light });
        } else {
            this.setTenantTheme(tenantDomain);
        }
    }


    /**
     *
     * for more information about this pattern
     * reffer https://reactjs.org/docs/context.html#updating-context-from-a-nested-component
     * @param {Object} settings set the settings state in the APP state, which will implesitly
     * set in the Settings context
     * @memberof DevPortal
     */
    setSettings(settings) {
        this.setState({ settings });
    }

    /**
     * Load Theme file.
     *
     * @param {string} tenant tenant name
     */
    setTenantTheme(tenant) {
        fetch(`${Settings.app.context}/site/public/tenant_themes/${tenant}/apim/defaultTheme.json`)
            .then((resp) => resp.json())
            .then((data) => {
                this.setState({ theme: data.themes.light });
            })
            .catch(() => {
                this.setState({ theme: Configurations.themes.light });
            });
    }

    /**
     * Add two numbers.
     * @param {object} theme object.
     * @returns {JSX} link dom tag.
     */
    loadCustomCSS(theme) {
        const { custom: { tenantCustomCss } } = theme;
        const { tenantDomain } = this.state;
        let cssUrlWithTenant = tenantCustomCss;
        if (tenantDomain && tenantCustomCss) {
            cssUrlWithTenant = tenantCustomCss.replace('<tenant-domain>', tenantDomain);
        }
        if (cssUrlWithTenant) {
            return (
                <link
                    rel='stylesheet'
                    type='text/css'
                    href={`${Settings.app.context}/${cssUrlWithTenant}`}
                />
            );
        } else {
            return '';
        }
    }

    /**
     * Add two numbers.
     * @param {object} theme object.
     * @returns {JSX} link dom tag.
     */
    getTitle(theme) {
        const {
            custom: {
                title: {
                    prefix, sufix,
                },
            },
        } = theme;
        return (prefix + sufix);
    }

    // If the passive mode is enabled then this method will check whether a user is already logged into the publisher  
    // by appending a prompt=none to the authorize endpoint. 
    // If there is an external IDP then this will redirect to the services/config endpoint otherwsie normal fetch 
    // call will be made.
    checkLoginUser(isExternalIDP) {
        if (isExternalIDP) {
            this.setState({externalidp:true})
            if (!sessionStorage.getItem('loginStatus')) {
                sessionStorage.setItem('loginStatus', "check-Login-status");
                window.location = Settings.app.context + '/services/configs?loginPrompt=false';
            }
            else if (sessionStorage.getItem('loginStatus')) {
                sessionStorage.removeItem('loginStatus');
            }
        }
        else {
            fetch(Settings.app.context + '/services/configs?loginPrompt=false')
            .then(response => {
                if(response){
                    this.setState({ authresponse: true}); 
                }
            })
            .catch((error) => {
                console.error(
                    'Error while fetching : ',
                    error,
                );
            });
        }
    }

    /**
     * Reners the DevPortal component
     * @returns {JSX} this is the description
     * @memberof DevPortal
     */
    render() {
        const { settings, tenantDomain, theme, authresponse,externalidp } = this.state;
        const { app: { context } } = Settings;
        if (Settings.app.isPassive && !authresponse && !externalidp && !AuthManager.getUser() && !sessionStorage.getItem('notEnoughPermission') && !Settings.app.isNonAnonymous) {
            return <Loading />;
        }

        return (
            settings && theme && (
                <SettingsProvider value={{
                    settings,
                    setSettings: this.setSettings,
                    tenantDomain,
                    setTenantDomain: this.setTenantDomain,
                }}
                >
                    <Helmet>
                        <title>{this.getTitle(theme)}</title>
                    </Helmet>
                    <MuiThemeProvider theme={createMuiTheme(theme)}>
                        {this.loadCustomCSS(theme)}
                        <BrowserRouter basename={context}>
                            <Suspense fallback={<Progress />}>
                                <Switch>
                                    <Route path='/logout' component={Logout} />
                                    <Route component={protectedApp} />
                                </Switch>
                            </Suspense>
                        </BrowserRouter>
                    </MuiThemeProvider>
                </SettingsProvider>
            )
        );
    }
}

export default DevPortal;
