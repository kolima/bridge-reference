import React, { useEffect } from 'react';

import { create, NxtpSdkConfig } from '@connext/nxtp-sdk';
import connextLogo from 'url:../../public/connext-white-logo.webp';
import { useWallet } from '../contexts/Wallet';
import { Wallet } from './Wallet';
import { useChains } from '../contexts/Chains';
import { useAssets } from '../contexts/Assets';
import { useSdk } from '../contexts/Sdk';
import { ChainConfig } from '@connext/nxtp-sdk/dist/config';

export const Header = () => {
    const walletContext = useWallet();
    const {
        state: { chains }
    } = useChains();
    const {
        state: { assets }
    } = useAssets();

    const {
        state: { sdk },
        dispatch
    } = useSdk();

    const { web3_provider, provider, address, signer } = { ...walletContext.state };

    // init sdk
    useEffect(() => {
        const init = async () => {
            if (!(chains && assets)) {
                return;
            }

            const chains_config: Record<string, ChainConfig> = {};
            for (const chain_data of chains) {
                const { chain_id, domain_id, provider_params } = { ...chain_data };

                const rpc_urls = provider_params?.[0]?.rpcUrls?.filter(url => url) || [];

                if (domain_id) {
                    chains_config[domain_id] = {
                        providers: rpc_urls,
                        assets: assets
                            .filter(a => a?.contracts?.findIndex(c => c?.chain_id === chain_id) > -1)
                            .map(a => {
                                const { name, contracts } = { ...a };
                                const contract_data = contracts.find(c => c?.chain_id === chain_id);
                                const { contract_address } = { ...contract_data };
                                const symbol = contract_data?.symbol || a?.symbol;
                                return {
                                    name: name || symbol,
                                    address: contract_address,
                                    symbol,
                                    mainnetEquivalent: undefined
                                };
                            })
                    } as ChainConfig;
                }
            }
            let network: 'testnet' | 'mainnet' | 'local' | undefined = undefined;
            let environment: 'staging' | 'production' | undefined = undefined;

            if (
                process.env.PUBLIC_NETWORK === 'testnet' ||
                process.env.PUBLIC_NETWORK === 'mainnet' ||
                process.env.PUBLIC_NETWORK === 'local'
            ) {
                network = process.env.PUBLIC_NETWORK;
            } else if (!process.env.PUBLIC_ENVIRONMENT) {
                console.error('Wrong PUBLIC_NETWORK environment variable');
            }

            if (process.env.PUBLIC_ENVIRONMENT === 'staging' || process.env.PUBLIC_ENVIRONMENT === 'production') {
                environment = process.env.PUBLIC_ENVIRONMENT;
            } else if (!process.env.PUBLIC_ENVIRONMENT) {
                console.error('Wrong PUBLIC_ENVIRONMENT environment variable');
            }

            const config: NxtpSdkConfig = {
                chains: chains_config,
                logLevel: 'info',
                network,
                environment
            };

            dispatch({
                type: 'set',
                payload: await create(config)
            });

            console.log('[SDK config]', config);
        };

        init();
    }, [chains, assets]);

    useEffect(() => {
        const update = async () => {
            if (sdk && address) {
                if (sdk.nxtpSdkBase) {
                    await sdk.nxtpSdkBase.changeSignerAddress(address);
                }
                if (sdk.nxtpSdkRouter) {
                    await sdk.nxtpSdkRouter.changeSignerAddress(address);
                }

                dispatch({
                    type: 'set',
                    payload: sdk
                });

                console.log('[Signer address]', address);
            }
        };
        update();
    }, [sdk, provider, web3_provider, address, signer]);

    return (
        <div className="py-4 border-b border-slate-900/10 px-8  dark:border-slate-300/10 mx-4 lg:mx-0">
            <div className="flex justify-between lg:px-10 items-center px-1 pb-5 md:pb-0">
                <img src={connextLogo} alt="Connext Logo" className="h-8 w-auto sm:h-10" />
                <div className="flex items-center justify-end">
                    {web3_provider && address && (
                        <div className="hidden sm:flex flex-col space-y-0.5 mx-2">
                            <div className="flex items-center space-x-2">
                                <span
                                    title={address}
                                    className="normal-case text-black dark:text-white text-base font-semibold"
                                >
                                    <span>{address}</span>
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="mx-2">
                        <Wallet main={true} />
                    </div>
                </div>
            </div>
        </div>
    );
};
