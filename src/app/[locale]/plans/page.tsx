"use client";

import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Box, Text, Center, Spinner, Heading, Icon, Flex } from "@chakra-ui/react";
import { usePlansColors } from "@/utils/colors";
import PlanCalendar from "@/components/plans/plan_calendar";
import { usePathname } from "next/navigation";
import { IPlan, IPlanFromAPI } from "@/types/plan";
import { FaTasks } from "react-icons/fa";
import { Badge } from "@chakra-ui/react";

export default function PlansPage() {
  const t = useTranslations("Plans");
  const colors = usePlansColors();
  const pathname = usePathname();

  // Get plans and view mode from Redux
  const { plans, layout, loading } = useSelector(
    (state: RootState) => state.plan
  );

  const { currentUser } = useSelector(
    (state: RootState) => state.user
  );

  // Filter plans to only show those in user's active rooms
  const filteredPlans = plans.filter((plan: IPlanFromAPI) =>
    plan && currentUser?.active_rooms?.includes(plan.room_id)
  );

  // Format plans with proper date objects for calendar view
  const formattedPlans = filteredPlans.map((plan: IPlanFromAPI): IPlan => ({
    ...plan,
    created_at: plan.created_at ? new Date(plan.created_at) : new Date(),
    updated_at: plan.updated_at ? new Date(plan.updated_at) : new Date(),
    completed_at: plan.completed_at ? new Date(plan.completed_at) : null
  }));

  // Extract the current plan ID from the pathname
  const currentPlanId = pathname.split('/').pop();

  // Check if we're on the main plans page or a specific plan
  const isMainPlansPage = pathname === '/plans' || pathname === '/plans/' || !currentPlanId;

  // Get the current plan
  const currentPlan = plans.find((plan: IPlanFromAPI) => plan && plan.plan_id === currentPlanId);

  // If we're loading or there are no plans, show a loading state or message
  if (loading.plans) {
    return (
      <Center height="100%" width="100%">
        <Spinner size="xl" color={colors.accentColor} />
      </Center>
    );
  }

  if (filteredPlans.length === 0) {
    return (
      <Center height="100%" width="100%" p={8}>
        <Text color={colors.textColorMuted}>{t("no_plans_available")}</Text>
      </Center>
    );
  }

  // If we're on the main plans page or no plan is selected, show a "no plan selected" message
  if (isMainPlansPage || !currentPlan) {
    return (
      <Box height="100%" width="100%" overflow="auto">
        {layout.viewMode === 'calendar' ? (
          <PlanCalendar
            plans={formattedPlans}
            currentPlanId={currentPlanId}
            viewMode={layout.viewMode}
            onViewModeChange={() => { }}
          />
        ) : (
          <Flex
            height="100%"
            width="100%"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            p={8}
            overflow="hidden" // Prevent scrolling
          >
            <Box
              textAlign="center"
              maxWidth="400px"
              p={6}
              borderRadius="md"
              bg={colors.cardBg}
              boxShadow="sm"
              borderWidth="1px"
              borderColor={colors.borderColor}
            >
              <Icon as={FaTasks} boxSize={12} color={colors.textColorMuted} mb={4} />
              <Heading size="md" color={colors.textColorHeading} mb={2}>
                {t("no_plan_selected")}
              </Heading>
              <Text color={colors.textColorMuted} textAlign="center">
                {t("select_plan_from_sidebar")}
              </Text>
            </Box>
          </Flex>
        )}
      </Box>
    );
  }

  // If we have a valid current plan, show just that plan
  const validPlan = {
    ...currentPlan,
    created_at: currentPlan.created_at ? new Date(currentPlan.created_at) : new Date(),
    updated_at: currentPlan.updated_at ? new Date(currentPlan.updated_at) : new Date(),
    completed_at: currentPlan.completed_at ? new Date(currentPlan.completed_at) : null
  };

  // Show the plan details in the appropriate view
  return (
    <Box height="100%" width="100%" overflow="auto">
      {layout.viewMode === 'calendar' ? (
        <PlanCalendar
          plans={[validPlan]}
          currentPlanId={currentPlanId}
          viewMode={layout.viewMode}
          onViewModeChange={() => { }}
        />
      ) : (
        // For kanban view, we'll show plan details instead of a kanban board
        <Box p={6}>
          <Heading size="md" mb={4} color={colors.textColorHeading}>
            {validPlan.plan_name}
          </Heading>
          <Text mb={4} color={colors.textColor}>
            {validPlan.plan_overview}
          </Text>
          <Box mb={4}>
            <Text fontWeight="bold" color={colors.textColorHeading}>
              {t("status")}:
            </Text>
            <Badge
              colorScheme={
                validPlan.status === 'success' ? 'green' :
                  validPlan.status === 'running' ? 'blue' :
                    validPlan.status === 'pending' ? 'yellow' :
                      validPlan.status === 'failure' ? 'red' : 'gray'
              }
              mt={1}
            >
              {validPlan.status}
            </Badge>
          </Box>
          <Text fontSize="sm" color={colors.textColorMuted}>
            {t("last_updated")}: {validPlan.updated_at.toLocaleString()}
          </Text>
        </Box>
      )}
    </Box>
  );
}