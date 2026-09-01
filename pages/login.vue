<script setup lang="ts">
definePageMeta({ layout: 'login' })
useHead({ title: 'Sign in' })

</script>

<template>
  <!-- A sheet on the press bed: the sign-in sits on stock, registered by four
       crosses, with the product's one claim printed beside it. -->
  <div class="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
    <section class="relative hidden flex-col justify-between border-r border-stock-400 p-12 lg:flex">
      <div class="flex items-center gap-3">
        <img src="~/assets/images/penguin.png" alt="" class="h-9 w-auto" />
        <span class="text-lg font-semibold tracking-tight">Labeloo</span>
      </div>

      <div class="max-w-lg">
        <h1 class="text-[3.25rem] font-semibold leading-[1.04] tracking-[-0.03em]">
          One click lays the ink.
        </h1>
        <p class="mt-5 max-w-md text-[15px] leading-relaxed text-stock-700">
          Click an object and it is segmented. Click it once in a clip and it is followed
          to the end. Every class is an ink, and every mark is a separation over the plate.
        </p>

      </div>

      <dl class="furniture flex gap-8 text-stock-600">
        <div class="docket-field"><dt>Images</dt><dd class="text-stock-950">Assisted</dd></div>
        <div class="docket-field"><dt>Video</dt><dd class="text-stock-950">Tracked</dd></div>
        <div class="docket-field"><dt>Teams</dt><dd class="text-stock-950">Roles</dd></div>
      </dl>

      <span class="regmark text-stock-400" style="left: 24px; top: 24px" />
      <span class="regmark text-stock-400" style="right: 24px; top: 24px" />
      <span class="regmark text-stock-400" style="left: 24px; bottom: 24px" />
      <span class="regmark text-stock-400" style="right: 24px; bottom: 24px" />
    </section>

    <section class="flex items-center justify-center px-6 py-12">
      <div class="w-full max-w-sm">
        <div class="mb-8 flex items-center gap-3 lg:hidden">
          <img src="~/assets/images/penguin.png" alt="" class="h-8 w-auto" />
          <span class="text-base font-semibold tracking-tight">Labeloo</span>
        </div>

        <h2 class="text-2xl font-semibold tracking-tight">Sign in</h2>
        <p class="mt-1.5 text-[14px] text-stock-600">Pick up where the last sheet left off.</p>

        <div class="mt-7">
          <AuthLoginForm />
        </div>

        <!-- There is no self-serve sign-up and no password reset flow in this
             product: accounts are created through the API and an organization
             admin then adds an existing account. Linking to pages that do not
             exist sent people to a 404; saying so sends them to a person. -->
        <p class="mt-8 border-t border-stock-400 pt-5 text-[13px] leading-relaxed text-stock-600">
          Accounts are created by an administrator. If you do not have one, or you cannot
          get in, ask whoever runs your Labeloo organization.
        </p>
      </div>
    </section>
  </div>
</template>
