import { sharedConfigs } from '@nodescript/eslint-config';

export default [
    ...sharedConfigs,
    {
        rules: {
            'vue/max-attributes-per-line': ['error', {
                singleline: { max: 6 },
                multiline: { max: 1 },
            }]
        }
    }
];
